import pandas as pd
import numpy as np
import math
import warnings
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestRegressor
from shapely.geometry import Point, Polygon, LineString
import networkx as nx

warnings.filterwarnings('ignore')
app = FastAPI()

# Serve static frontend files from the 'static' directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Allow React / Frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. INITIALIZE & TRAIN MODELS AT STARTUP
# ==========================================
print("Training Weather Model (temp.csv)...")
df_temp = pd.read_csv(r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\temp.csv", encoding='utf-8', encoding_errors='replace', on_bad_lines='skip')
df_temp['timestamp'] = pd.to_datetime(df_temp['timestamp'])
X_temp = pd.DataFrame({'month': df_temp['timestamp'].dt.month, 'day': df_temp['timestamp'].dt.day, 'hour': df_temp['timestamp'].dt.hour, 'minute': df_temp['timestamp'].dt.minute})
y_temp = df_temp[['humidity', 'temperature']]
model_weather = RandomForestRegressor(n_estimators=50, random_state=42).fit(X_temp, y_temp)

print("Training Wind Model (wind.csv)...")
df_wind = pd.read_excel(r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\wind.csv", engine='openpyxl')
df_wind['timestamp'] = pd.to_datetime(df_wind['timestamp'])
X_wind = pd.DataFrame({'month': df_wind['timestamp'].dt.month, 'day': df_wind['timestamp'].dt.day, 'hour': df_wind['timestamp'].dt.hour, 'minute': df_wind['timestamp'].dt.minute, 'temperature': df_wind['temperature'], 'humidity': df_wind['humidity']})
y_wind = df_wind[['wind_speed', 'wind_direction']]
model_wind = RandomForestRegressor(n_estimators=50, random_state=42).fit(X_wind, y_wind)

print("Training Threat Model (tank_snapshots.csv)...")
df_threat = pd.read_csv(r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\tank_snapshots.csv")
# Constants for Propane (P in bar, T in Celsius)
A, B, C = 4.00272, 806.794, 259.3
df_threat['vapor_pressure_bar'] = 10 ** (A - (B / (df_threat['temperature_c'] + C)))
df_threat['hoop_stress_pa'] = (df_threat['vapor_pressure_bar'] * 100000 * (df_threat['tank_diameter_m'] / 2)) / df_threat['wall_thickness_m']
X_threat = df_threat[['temperature_c', 'wind_speed_ms', 'vapor_pressure_bar', 'hoop_stress_pa']]
y_threat = df_threat['time_to_failure_min']
model_threat = RandomForestRegressor(n_estimators=50, random_state=42).fit(X_threat, y_threat)
print("All models trained and ready!")

# ==========================================
# 2. GEOSPATIAL HELPER FUNCTIONS
# ==========================================
def offset_point(lat, lng, dx_meters, dy_meters):
    """Converts meter offsets into latitude/longitude coordinates."""
    r_earth = 6378137.0
    dlat = (dy_meters / r_earth) * (180 / math.pi)
    dlng = (dx_meters / (r_earth * math.cos(math.pi * lat / 180))) * (180 / math.pi)
    return lat + dlat, lng + dlng

def create_hazard_polygon(lat, lng, wind_deg, wind_speed, base_radius, stretch_factor):
    # wind_deg is where wind comes FROM. Downwind is where it blows TO.
    rad = math.radians((wind_deg + 180) % 360)
    
    # Shift the center downwind based on wind speed
    shift_distance = wind_speed * stretch_factor
    shift_x = shift_distance * math.sin(rad)
    shift_y = shift_distance * math.cos(rad)
    center_lat, center_lng = offset_point(lat, lng, shift_x, shift_y)
    
    angles = np.linspace(0, 2 * math.pi, 32)
    coords = []
    rx = base_radius + (wind_speed * 5) # Downwind elongation (major axis u)
    ry = base_radius                    # Crosswind width (minor axis v)
    
    for a in angles:
        u = rx * math.cos(a)
        v = ry * math.sin(a)
        
        x_rot = u * math.sin(rad) + v * math.cos(rad)
        y_rot = u * math.cos(rad) - v * math.sin(rad)
        
        pt_lat, pt_lng = offset_point(center_lat, center_lng, x_rot, y_rot)
        coords.append((pt_lng, pt_lat))
        
    return Polygon(coords)

def create_temporal_hazard_polygon(lat, lng, wind_deg, wind_speed, base_radius, stretch_factor, minutes):
    """Generates expanded downwind hazard polygons up to T = 2 Hours (120 mins) for post-blast views."""
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
# 3. API REQUEST SCHEMAS
# ==========================================
class PredictionRequest(BaseModel):
    target_time: str      # Format: "YYYY-MM-DD HH:MM:SS"
    lat: float
    lng: float
    fuel_mass_kg: float
    tank_diameter_m: float = 15.0
    wall_thickness_m: float = 0.015

class PostBlastRequest(BaseModel):
    lat: float
    lng: float
    wind_deg: float      # Wind origin direction in degrees
    wind_speed: float    # Wind speed in m/s
    tank_diameter: float # Tank Diameter in meters
    tank_height: float   # Tank Height in meters
    time_offset_min: int # Time horizon: 0 to 120 minutes

# ==========================================
# 4. API ENDPOINTS
# ==========================================

@app.post("/api/predict-scenario")
def predict_scenario(req: PredictionRequest):
    # --- A. Predict Weather ---
    dt = pd.to_datetime(req.target_time)
    time_features = pd.DataFrame({'month': [dt.month], 'day': [dt.day], 'hour': [dt.hour], 'minute': [dt.minute]})
    
    weather_pred = model_weather.predict(time_features)[0]
    pred_hum, pred_temp = weather_pred[0], weather_pred[1]
    
    # --- B. Predict Wind ---
    wind_features = time_features.copy()
    wind_features['temperature'] = pred_temp
    wind_features['humidity'] = pred_hum
    
    wind_pred = model_wind.predict(wind_features)[0]
    pred_wind_speed, pred_wind_deg = wind_pred[0], wind_pred[1]
    
    # --- C. Predict Physical Stress & Time-To-Failure ---
    vapor_pressure = 10 ** (A - (B / (pred_temp + C)))
    hoop_stress = (vapor_pressure * 100000 * (req.tank_diameter_m / 2)) / req.wall_thickness_m
    
    threat_features = pd.DataFrame([[pred_temp, pred_wind_speed, vapor_pressure, hoop_stress]], columns=X_threat.columns)
    time_to_failure = model_threat.predict(threat_features)[0]
    
    # --- D. Calculate Blast Physics (Hopkinson-Cranz) ---
    tnt_mass = (req.fuel_mass_kg * 46) / 4.184 * 0.1
    lethal_radius = 1.0 * (tnt_mass ** (1/3))  # 10+ psi
    injury_radius = 4.8 * (tnt_mass ** (1/3))  # 1+ psi
    
    # --- E. Generate Geospatial Polygons & Routing ---
    danger_poly = create_hazard_polygon(req.lat, req.lng, pred_wind_deg, pred_wind_speed, base_radius=lethal_radius, stretch_factor=5)
    mod_poly = create_hazard_polygon(req.lat, req.lng, pred_wind_deg, pred_wind_speed, base_radius=injury_radius, stretch_factor=10)
    
    # Rescue Pathfinding
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

    # --- F. Return Final Payload to React ---
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

    # Ordered explicitly from Largest Outer Zone (Green) to Smallest Inner Zone (Red)
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

    # Shortest Safest Approach Path Calculation
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


# Serve the frontend HTML page at the root URL
@app.get("/")
def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())