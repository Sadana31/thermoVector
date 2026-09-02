import bisect
import math
import os
import warnings
from collections import Counter
from dataclasses import dataclass
from enum import Enum
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import networkx as nx
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field
from shapely.geometry import LineString, Point, Polygon
from sklearn.ensemble import RandomForestRegressor

warnings.filterwarnings('ignore')

# ==========================================
# 1. CONSTANTS[cite: 13]
# ==========================================
GRID_EXTENT_M = 500.0
GRID_CELL_SIZE_M = 25.0
MIN_SOURCE_DISTANCE_M = 2.0
AIR_ATTENUATION_PER_M = 0.0015
DEFAULT_ATMOSPHERIC_TRANSMISSIVITY = 0.85
THERMAL_THRESHOLDS_KW_M2 = {"moderate": 2.0, "high": 5.0, "critical": 10.0}
BLAST_THRESHOLDS_KPA = {"moderate": 6.895, "high": 24.132, "critical": 55.158}
TNT_ENERGY_J_PER_KG = 4.184e6
COMBUSTION_ENERGY_J_PER_KG = 46.0e6
DEFAULT_TNT_EFFICIENCY = 0.03
THERMAL_WIND_RESPONSE = 1.0
BLAST_WIND_RESPONSE = 0.12

TNT_SCALED_DISTANCE_TABLE = (
    (0.5, 700.0), (1.0, 300.0), (2.0, 100.0), (3.0, 50.0),
    (5.0, 20.0), (8.0, 8.0), (12.0, 3.5), (20.0, 1.0), (30.0, 0.4),
)

SEVERITY_ORDER = ("critical", "high", "moderate")
COMPASS = (("N", 0), ("NE", 45), ("E", 90), ("SE", 135), ("S", 180), ("SW", 225), ("W", 270), ("NW", 315))

# ==========================================
# 2. FASTAPI SETUP
# ==========================================
app = FastAPI(title="ThermaVector Hazard & Emergency Response API", version="2.0.0")

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$", #[cite: 10]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. INITIALIZE & TRAIN ML MODELS
# ==========================================
print("Training Weather Model (temp.csv)...")
try:
    temp_path = r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\temp.csv"
    df_temp = pd.read_csv(temp_path, encoding='utf-8', encoding_errors='replace', on_bad_lines='skip')
    df_temp['timestamp'] = pd.to_datetime(df_temp['timestamp'])
    X_temp = pd.DataFrame({
        'month': df_temp['timestamp'].dt.month, 
        'day': df_temp['timestamp'].dt.day, 
        'hour': df_temp['timestamp'].dt.hour, 
        'minute': df_temp['timestamp'].dt.minute
    })
    y_temp = df_temp[['humidity', 'temperature']]
    model_weather = RandomForestRegressor(n_estimators=50, random_state=42).fit(X_temp, y_temp)
except Exception as e:
    print(f"Warning: Could not train weather model from CSV ({e}). Using fallback dummy regressor.")
    model_weather = None

print("Training Wind Model (wind.csv)...")
try:
    wind_path = r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\wind.csv"
    df_wind = pd.read_excel(wind_path, engine='openpyxl')
    df_wind['timestamp'] = pd.to_datetime(df_wind['timestamp'])
    X_wind = pd.DataFrame({
        'month': df_wind['timestamp'].dt.month, 
        'day': df_wind['timestamp'].dt.day, 
        'hour': df_wind['timestamp'].dt.hour, 
        'minute': df_wind['timestamp'].dt.minute, 
        'temperature': df_wind['temperature'], 
        'humidity': df_wind['humidity']
    })
    y_wind = df_wind[['wind_speed', 'wind_direction']]
    model_wind = RandomForestRegressor(n_estimators=50, random_state=42).fit(X_wind, y_wind)
except Exception as e:
    print(f"Warning: Could not train wind model from Excel ({e}). Using fallback dummy regressor.")
    model_wind = None

print("Training Threat Model (tank_snapshots.csv)...")
try:
    threat_path = r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\tank_snapshots.csv"
    df_threat = pd.read_csv(threat_path)
    A_const, B_const, C_const = 4.00272, 806.794, 259.3
    df_threat['vapor_pressure_bar'] = 10 ** (A_const - (B_const / (df_threat['temperature_c'] + C_const)))
    df_threat['hoop_stress_pa'] = (df_threat['vapor_pressure_bar'] * 100000 * (df_threat['tank_diameter_m'] / 2)) / df_threat['wall_thickness_m']
    X_threat = df_threat[['temperature_c', 'wind_speed_ms', 'vapor_pressure_bar', 'hoop_stress_pa']]
    y_threat = df_threat['time_to_failure_min']
    model_threat = RandomForestRegressor(n_estimators=50, random_state=42).fit(X_threat, y_threat)
except Exception as e:
    print(f"Warning: Could not train threat model from CSV ({e}). Using fallback dummy regressor.")
    model_threat = None

print("All models initialized and ready!")

# ==========================================
# 4. API REQUEST SCHEMAS
# ==========================================
class HazardType(str, Enum): #[cite: 8]
    thermal = "thermal"
    blast = "blast"

class FacilityConfiguration(str, Enum): #[cite: 8]
    single = "single"
    dual = "dual"

class EstimateRequest(BaseModel): #[cite: 8]
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    configuration: FacilityConfiguration = FacilityConfiguration.single
    hazard_type: HazardType
    wind_speed_m_s: float = Field(ge=0, le=100)
    wind_direction_deg: float = Field(ge=0, lt=360)
    tank_diameter_m: float = Field(default=20, gt=0, le=200)
    tank_height_m: float = Field(default=15, gt=0, le=200)
    fuel_mass_kg: float = Field(default=50_000, gt=0, le=10_000_000)

class EstimateResponse(BaseModel): #[cite: 8]
    hazard_type: HazardType
    configuration: FacilityConfiguration
    wind: dict[str, Any]
    severity_zones: list[dict[str, Any]]
    geojson: dict[str, Any]
    metadata: dict[str, Any]
    lower_hazard_approach_direction: str
    disclaimer: str

class PredictionRequest(BaseModel):
    target_time: str
    lat: float
    lng: float
    fuel_mass_kg: float
    tank_diameter_m: float = 15.0
    wall_thickness_m: float = 0.015

class PostBlastRequest(BaseModel):
    lat: float
    lng: float
    wind_deg: float
    wind_speed: float
    tank_diameter: float
    tank_height: float
    time_offset_min: int

# ==========================================
# 5. GEOSPATIAL & PHYSICS HELPER FUNCTIONS
# ==========================================
@dataclass(frozen=True) #[cite: 11]
class Source:
    east_m: float
    north_m: float
    diameter_m: float
    height_m: float
    fuel_mass_kg: float

def build_sources(request: EstimateRequest) -> list[Source]: #[cite: 11]
    if request.configuration.value == "single":
        return [Source(0.0, 0.0, request.tank_diameter_m, request.tank_height_m, request.fuel_mass_kg)]
    diameter = request.tank_diameter_m / 2**0.5
    separation = max(request.tank_diameter_m * 1.5, diameter * 2.0)
    return [
        Source(-separation / 2, 0.0, diameter, request.tank_height_m, request.fuel_mass_kg / 2),
        Source(separation / 2, 0.0, diameter, request.tank_height_m, request.fuel_mass_kg / 2),
    ]

def wind_toward_unit_vector(direction_from_deg: float) -> tuple[float, float]:
    toward = math.radians((direction_from_deg + 180.0) % 360.0)
    return math.sin(toward), math.cos(toward)

def wind_relative(east_m: float, north_m: float, direction_from_deg: float) -> tuple[float, float]:
    ue, un = wind_toward_unit_vector(direction_from_deg)
    return east_m * ue + north_m * un, east_m * un - north_m * ue

def effective_distance(east_m: float, north_m: float, direction_from_deg: float,
                       wind_speed_m_s: float, response: float) -> float:
    downwind, crosswind = wind_relative(east_m, north_m, direction_from_deg)
    influence = response * min(wind_speed_m_s / 10.0, 1.5)
    along_scale = 1.0 + influence if downwind >= 0 else 1.0 / (1.0 + 0.35 * influence)
    cross_scale = 1.0 / (1.0 + 0.15 * influence)
    return math.hypot(downwind / along_scale, crosswind / cross_scale)

def thermal_flux_kw_m2(distance_m: float, diameter_m: float, height_m: float) -> float: #[cite: 9]
    distance = max(distance_m, MIN_SOURCE_DISTANCE_M)
    flame_area_m2 = math.pi * diameter_m * (height_m + diameter_m / 2)
    emissive_power_kw_m2 = 120.0
    radiant_power_kw = emissive_power_kw_m2 * flame_area_m2
    transmission = DEFAULT_ATMOSPHERIC_TRANSMISSIVITY * math.exp(-AIR_ATTENUATION_PER_M * distance)
    return radiant_power_kw * transmission / (4.0 * math.pi * distance**2)

def blast_overpressure_kpa(distance_m: float, fuel_mass_kg: float) -> float: #[cite: 9]
    equivalent_tnt_kg = fuel_mass_kg * COMBUSTION_ENERGY_J_PER_KG * DEFAULT_TNT_EFFICIENCY / TNT_ENERGY_J_PER_KG
    scaled = max(distance_m, MIN_SOURCE_DISTANCE_M) / equivalent_tnt_kg ** (1.0 / 3.0)
    distances = [row[0] for row in TNT_SCALED_DISTANCE_TABLE]
    if scaled <= distances[0]:
        return TNT_SCALED_DISTANCE_TABLE[0][1]
    if scaled >= distances[-1]:
        z, pressure = TNT_SCALED_DISTANCE_TABLE[-1]
        return pressure * (z / scaled) ** 2
    index = bisect.bisect_right(distances, scaled)
    z1, p1 = TNT_SCALED_DISTANCE_TABLE[index - 1]
    z2, p2 = TNT_SCALED_DISTANCE_TABLE[index]
    fraction = (math.log(scaled) - math.log(z1)) / (math.log(z2) - math.log(z1))
    return math.exp(math.log(p1) + fraction * (math.log(p2) - math.log(p1)))

def intensity_at(east_m: float, north_m: float, sources: list[Source], hazard_type: str,
                 wind_speed_m_s: float, wind_direction_deg: float) -> float: #[cite: 9]
    total = 0.0
    response = THERMAL_WIND_RESPONSE if hazard_type == "thermal" else BLAST_WIND_RESPONSE
    for source in sources:
        distance = effective_distance(east_m - source.east_m, north_m - source.north_m,
                                      wind_direction_deg, wind_speed_m_s, response)
        if hazard_type == "thermal":
            total += thermal_flux_kw_m2(distance, source.diameter_m, source.height_m)
        else:
            total += blast_overpressure_kpa(distance, source.fuel_mass_kg)
    return total

def classify(intensity: float, hazard_type: str) -> str: #[cite: 12]
    thresholds = THERMAL_THRESHOLDS_KW_M2 if hazard_type == "thermal" else BLAST_THRESHOLDS_KPA
    for severity in SEVERITY_ORDER:
        if intensity >= thresholds[severity]:
            return severity
    return "below_threshold"

def local_to_lon_lat(east_m: float, north_m: float, lat: float, lon: float) -> list[float]: #[cite: 12]
    return [lon + east_m / (111_320.0 * max(math.cos(math.radians(lat)), 0.01)), lat + north_m / 110_540.0]

def lower_hazard_direction(sources, request: EstimateRequest) -> tuple[str, dict[str, float]]: #[cite: 12]
    scores = {}
    for label, bearing in COMPASS:
        angle = math.radians(bearing)
        samples = [intensity_at(math.sin(angle) * r, math.cos(angle) * r, sources,
                                request.hazard_type.value, request.wind_speed_m_s,
                                request.wind_direction_deg) for r in (100.0, 200.0, 300.0)]
        scores[label] = sum(samples) / len(samples)
    return min(scores, key=scores.get), scores

def estimate(request: EstimateRequest) -> dict: #[cite: 12]
    sources = build_sources(request)
    features = []
    counts = Counter()
    half = GRID_CELL_SIZE_M / 2
    steps = int(2 * GRID_EXTENT_M / GRID_CELL_SIZE_M)
    
    for ix in range(steps):
        east = -GRID_EXTENT_M + half + ix * GRID_CELL_SIZE_M
        for iy in range(steps):
            north = -GRID_EXTENT_M + half + iy * GRID_CELL_SIZE_M
            value = intensity_at(east, north, sources, request.hazard_type.value,
                                 request.wind_speed_m_s, request.wind_direction_deg)
            severity = classify(value, request.hazard_type.value)
            if severity == "below_threshold":
                continue
            counts[severity] += 1
            corners = [(east-half, north-half), (east+half, north-half), (east+half, north+half),
                       (east-half, north+half), (east-half, north-half)]
            features.append({"type": "Feature", "properties": {
                "severity": severity, "hazard_type": request.hazard_type.value,
                "intensity": round(value, 4), "unit": "kW/m2" if request.hazard_type.value == "thermal" else "kPa",
                "configuration": request.configuration.value,
            }, "geometry": {"type": "Polygon", "coordinates": [[local_to_lon_lat(e, n, request.latitude, request.longitude) for e, n in corners]]}})
            
    approach, sector_scores = lower_hazard_direction(sources, request)
    thresholds = THERMAL_THRESHOLDS_KW_M2 if request.hazard_type.value == "thermal" else BLAST_THRESHOLDS_KPA
    zones = [{"severity": s, "threshold": thresholds[s], "cell_count": counts[s]} for s in SEVERITY_ORDER]
    
    return {
        "hazard_type": request.hazard_type.value, "configuration": request.configuration.value,
        "wind": {"speed_m_s": request.wind_speed_m_s, "direction_from_deg": request.wind_direction_deg,
                 "convention": "meteorological: direction FROM; 0=N, 90=E"},
        "severity_zones": zones, "geojson": {"type": "FeatureCollection", "features": features},
        "metadata": {"grid_extent_m": GRID_EXTENT_M, "grid_cell_size_m": GRID_CELL_SIZE_M,
                     "feature_count": len(features), "source_count": len(sources),
                     "sector_scores": {k: round(v, 4) for k, v in sector_scores.items()},
                     "model": "simplified educational effective-distance model"},
        "lower_hazard_approach_direction": approach,
        "disclaimer": "Educational prototype only; not certified for safety, emergency response, or regulation.",
    }

def offset_point(lat: float, lng: float, dx_meters: float, dy_meters: float) -> tuple[float, float]:
    r_earth = 6378137.0
    dlat = (dy_meters / r_earth) * (180 / math.pi)
    dlng = (dx_meters / (r_earth * math.cos(math.pi * lat / 180))) * (180 / math.pi)
    return lat + dlat, lng + dlng

def create_hazard_polygon(lat: float, lng: float, wind_deg: float, wind_speed: float, base_radius: float, stretch_factor: float) -> Polygon:
    rad = math.radians((wind_deg + 180) % 360)
    shift_distance = wind_speed * stretch_factor
    shift_x = shift_distance * math.sin(rad)
    shift_y = shift_distance * math.cos(rad)
    center_lat, center_lng = offset_point(lat, lng, shift_x, shift_y)
    
    angles = np.linspace(0, 2 * math.pi, 32)
    coords = []
    rx = base_radius + (wind_speed * 5)
    ry = base_radius
    
    for a in angles:
        u = rx * math.cos(a)
        v = ry * math.sin(a)
        x_rot = u * math.sin(rad) + v * math.cos(rad)
        y_rot = u * math.cos(rad) - v * math.sin(rad)
        pt_lat, pt_lng = offset_point(center_lat, center_lng, x_rot, y_rot)
        coords.append((pt_lng, pt_lat))
        
    return Polygon(coords)

def create_temporal_hazard_polygon(lat: float, lng: float, wind_deg: float, wind_speed: float, base_radius: float, stretch_factor: float, minutes: int) -> Polygon:
    rad = math.radians((wind_deg + 180) % 360)
    time_scale = 1.0 + (minutes / 30.0)
    effective_speed = wind_speed * time_scale
    shift_distance = (effective_speed * stretch_factor) + (minutes * 10)
    shift_x = shift_distance * math.sin(rad)
    shift_y = shift_distance * math.cos(rad)
    center_lat, center_lng = offset_point(lat, lng, shift_x, shift_y)
    
    angles = np.linspace(0, 2 * math.pi, 36)
    coords = []
    rx = (base_radius * time_scale) + (effective_speed * 5)
    ry = base_radius * time_scale
    
    for a in angles:
        x_rot = rx * math.cos(a) * math.cos(rad) - ry * math.sin(a) * math.sin(rad)
        y_rot = rx * math.cos(a) * math.sin(rad) + ry * math.sin(a) * math.cos(rad)
        pt_lat, pt_lng = offset_point(center_lat, center_lng, x_rot, y_rot)
        coords.append((pt_lng, pt_lat))
        
    return Polygon(coords)

def calculate_blast_probability(diameter: float, height: float, wind_speed: float) -> float:
    volume = (math.pi * (diameter ** 2) * height) / 4.0
    vol_risk = min(1.0, volume / 15000.0) * 0.5
    wind_risk = min(1.0, wind_speed / 40.0) * 0.3
    base_factor = 0.15
    prob = (vol_risk + wind_risk + base_factor) * 100.0
    return round(min(98.5, max(5.0, prob)), 1)

# ==========================================
# 6. API ENDPOINTS
# ==========================================
@app.get("/health") #[cite: 10]
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/api/v1/estimate", response_model=EstimateResponse) #[cite: 10]
def create_estimate(request: EstimateRequest) -> dict:
    return estimate(request)

@app.post("/api/predict-scenario")
def predict_scenario(req: PredictionRequest):
    dt = pd.to_datetime(req.target_time)
    time_features = pd.DataFrame({'month': [dt.month], 'day': [dt.day], 'hour': [dt.hour], 'minute': [dt.minute]})
    
    if model_weather:
        weather_pred = model_weather.predict(time_features)[0]
        pred_hum, pred_temp = weather_pred[0], weather_pred[1]
    else:
        pred_hum, pred_temp = 65.0, 32.0

    wind_features = time_features.copy()
    wind_features['temperature'] = pred_temp
    wind_features['humidity'] = pred_hum
    
    if model_wind:
        wind_pred = model_wind.predict(wind_features)[0]
        pred_wind_speed, pred_wind_deg = wind_pred[0], wind_pred[1]
    else:
        pred_wind_speed, pred_wind_deg = 4.5, 90.0

    A_c, B_c, C_c = 4.00272, 806.794, 259.3
    vapor_pressure = 10 ** (A_c - (B_c / (pred_temp + C_c)))
    hoop_stress = (vapor_pressure * 100000 * (req.tank_diameter_m / 2)) / req.wall_thickness_m
    
    if model_threat:
        threat_features = pd.DataFrame([[pred_temp, pred_wind_speed, vapor_pressure, hoop_stress]], columns=['temperature_c', 'wind_speed_ms', 'vapor_pressure_bar', 'hoop_stress_pa'])
        time_to_failure = model_threat.predict(threat_features)[0]
    else:
        time_to_failure = 120.0

    tnt_mass = (req.fuel_mass_kg * 46) / 4.184 * 0.1
    lethal_radius = 1.0 * (tnt_mass ** (1/3))
    injury_radius = 4.8 * (tnt_mass ** (1/3))
    
    danger_poly = create_hazard_polygon(req.lat, req.lng, pred_wind_deg, pred_wind_speed, base_radius=lethal_radius, stretch_factor=5)
    mod_poly = create_hazard_polygon(req.lat, req.lng, pred_wind_deg, pred_wind_speed, base_radius=injury_radius, stretch_factor=10)
    
    start_lat, start_lng = offset_point(req.lat, req.lng, -800, -800)
    grid_size = 15
    lats = np.linspace(start_lat - 0.002, req.lat + 0.002, grid_size)
    lngs = np.linspace(start_lng - 0.002, req.lng + 0.002, grid_size)
    
    G = nx.grid_2d_graph(grid_size, grid_size)
    nodes_dict = {(i, j): (lats[i], lngs[j]) for i in range(grid_size) for j in range(grid_size)}
    
    for u, v in G.edges():
        p1, p2 = Point(nodes_dict[u][1], nodes_dict[u][0]), Point(nodes_dict[v][1], nodes_dict[v][0])
        segment = LineString([p1, p2])
        weight = 1.0
        if segment.intersects(danger_poly): weight += 1000.0
        elif segment.intersects(mod_poly): weight += 50.0
        G[u][v]['weight'] = weight
        
    path_nodes = nx.shortest_path(G, source=(0, 0), target=(grid_size - 1, grid_size - 1), weight='weight')
    route_coords = [[nodes_dict[n][0], nodes_dict[n][1]] for n in path_nodes]

    return {
        "environmental_forecast": {
            "temperature_c": round(pred_temp, 2),
            "humidity_pct": round(pred_hum, 2),
            "wind_speed_ms": round(pred_wind_speed, 2),
            "wind_direction_deg": round(pred_wind_deg, 2)
        },
        "threat_assessment": {
            "vapor_pressure_bar": round(vapor_pressure, 2),
            "hoop_stress_pa": round(hoop_stress, 2),
            "time_to_failure_min": round(time_to_failure, 0)
        },
        "geojson": {
            "danger_zone": {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [list(danger_poly.exterior.coords)]},
                "properties": {"zone": "danger", "color": "#ff3333"}
            },
            "moderate_zone": {
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [list(mod_poly.exterior.coords)]},
                "properties": {"zone": "moderate", "color": "#ffaa00"}
            }
        },
        "tactical_routing": {
            "staging_point": [start_lat, start_lng],
            "safe_approach_route": route_coords
        }
    }

@app.post("/api/predict-hazard")
def predict_hazard(req: PostBlastRequest):
    volume = (math.pi * (req.tank_diameter ** 2) * req.tank_height) / 4.0
    blast_prob = calculate_blast_probability(req.tank_diameter, req.tank_height, req.wind_speed)
    vol_radius_modifier = math.pow(max(10.0, volume), 1/3) * 6.0

    zones_def = [
        {"name": "Safe Buffer Zone", "radius": vol_radius_modifier * 4.0, "stretch": 30, "color": "#22c55e", "opacity": 0.25},
        {"name": "Moderate Zone", "radius": vol_radius_modifier * 2.8, "stretch": 22, "color": "#eab308", "opacity": 0.45},
        {"name": "High Risk Zone", "radius": vol_radius_modifier * 1.8, "stretch": 14, "color": "#f97316", "opacity": 0.65},
        {"name": "Critical Danger Zone", "radius": vol_radius_modifier * 1.0, "stretch": 8, "color": "#ef4444", "opacity": 0.85}
    ]

    geojson_zones = []
    polygons = []

    for z in zones_def:
        poly = create_temporal_hazard_polygon(
            req.lat, req.lng, req.wind_deg, req.wind_speed,
            base_radius=z["radius"], stretch_factor=z["stretch"], minutes=req.time_offset_min
        )
        polygons.append(poly)
        geojson_zones.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [list(poly.exterior.coords)]
            },
            "properties": {
                "zone": z["name"],
                "color": z["color"],
                "opacity": z["opacity"]
            }
        })

    start_lat, start_lng = offset_point(req.lat, req.lng, -900, -900)
    grid_size = 24
    lats = np.linspace(start_lat - 0.004, req.lat + 0.004, grid_size)
    lngs = np.linspace(start_lng - 0.004, req.lng + 0.004, grid_size)
    
    G = nx.grid_2d_graph(grid_size, grid_size)
    nodes_dict = {}
    
    for i in range(grid_size):
        for j in range(grid_size):
            nodes_dict[(i, j)] = (lats[i], lngs[j])

    safe_poly, mod_poly, high_poly, crit_poly = polygons

    for u, v in G.edges():
        p1 = Point(nodes_dict[u][1], nodes_dict[u][0])
        p2 = Point(nodes_dict[v][1], nodes_dict[v][0])
        segment = LineString([p1, p2])
        
        dist = p1.distance(p2) * 111000
        penalty = 1.0
        
        if segment.intersects(crit_poly):
            penalty = 15000.0
        elif segment.intersects(high_poly):
            penalty = 800.0
        elif segment.intersects(mod_poly):
            penalty = 40.0
        elif segment.intersects(safe_poly):
            penalty = 2.0
            
        G[u][v]['weight'] = dist * penalty

    start_node = (0, 0)
    target_node = (grid_size - 1, grid_size - 1)
    
    path_nodes = nx.shortest_path(G, source=start_node, target=target_node, weight='weight')
    route_coords = [[nodes_dict[n][0], nodes_dict[n][1]] for n in path_nodes]

    threat_level = "CRITICAL" if req.time_offset_min >= 60 or blast_prob > 65 else "ELEVATED"

    return {
        "blast_probability": blast_prob,
        "tank_volume_m3": round(volume, 2),
        "threat_level": threat_level,
        "zones": geojson_zones,
        "rescue_route": route_coords,
        "staging_point": [start_lat, start_lng],
        "blast_point": [req.lat, req.lng]
    }

@app.get("/")
def read_root():
    if os.path.exists("static/index.html"):
        with open("static/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return {"message": "ThermaVector API is running successfully."}