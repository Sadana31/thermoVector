# ThermaVector: Industrial Threat Zone Estimator

ThermaVector is a full-stack engineering and hazard assessment platform engineered to model, simulate, and visualize blast wave propagation and thermal radiation exposure from pressurized industrial storage tanks. By coupling point-source flux matrices, atmospheric attenuation physics, and machine-learning-driven meteorological forecasting, the system delivers real-time spatial hazard envelopes, failure diagnostics, and tactical emergency response vectors.

---

## Architectural Overview

The application is structured into a modern single-page application (SPA) frontend and a high-performance computational backend:

* **Frontend Client:** Built with React 19, Vite, and Tailwind CSS. Spatial rendering is powered by Leaflet and React-Leaflet with custom interactive vector overlays.
* **Backend Engine:** High-throughput FastAPI services executing spatial math, GeoJSON polygon grid generation, and physical parameter regressions.
* **Physics & Modeling Pipeline:** Evaluates discrete 25m cellular grid points, hoop stress values, atmospheric wind vector decay, and blast overpressure thresholds.

---

<img width="1600" height="831" alt="image" src="https://github.com/user-attachments/assets/585e1ab9-87e4-482d-bd5e-e49bd0de0f9f" />

## Core System Modules

### 1. Pre-Blast Baseline & Risk Profiling (`/pre-blast`)

* Configuration of tank dimensions (diameter, height, wall thickness, and fuel mass).
* Calculation of internal volume, structural load thresholds, and failure susceptibility baselines.
<img width="1600" height="796" alt="image" src="https://github.com/user-attachments/assets/bbf0c04b-c7e6-4f97-bbc8-f00986dfd3f7" />


### 2. Real-Time Meteorological Threat Hub (`/current-blast`)

* Dynamic time-series integration for target forecast intervals.
* Simulation of prevailing wind bearings (0 to 360 degrees) and speeds (0 to 100 m/s).
* Live computation of internal hoop stress (MPa) and estimated time to structural failure (minutes).
* Automated threshold-driven emergency shutdown warnings with interactive modal overrides.

<img width="2880" height="1454" alt="image" src="https://github.com/user-attachments/assets/ebab6f3d-67ea-4079-92f9-f7c04e248298" />


### 3. Cellular Grid Exposure Matrix (`/results`)

* Renders a discrete 25m computational grid representing geographic threat intensities.
* Dual model evaluation:
* **Thermal Radiation:** Stratified by Critical (> 10.0 kW/m²), High (5.0 - 10.0 kW/m²), and Moderate (2.0 - 5.0 kW/m²) zones.
* **Blast Overpressure:** Stratified by Critical (> 55.2 kPa / 8+ psi), High (24.1 - 55.2 kPa / 3.5 - 8 psi), and Moderate (6.9 - 24.1 kPa / 1 - 3.5 psi) zones.


* Computes tactical approach bearings (least hazard path) and automated evacuation routing.

### 4. Post-Blast Forensic & Emergency Response (`/post-blast`)

* **Dynamic Temporal Propagation:** Slider-driven time-offset modeling (`T + 0` to `T + 60+ mins`) simulating downstream vapor and blast dispersion over time.
* **Multi-Tier Hazard Envelopes:** Real-time spatial mapping across four standard response tiers:
* **Critical Danger Zone (Red):** Direct blast overpressure and lethal thermal threshold.
* **High Hazard Zone (Orange):** Structural compromise and severe injury perimeter.
* **Moderate Risk Zone (Yellow):** Outer advisory and secondary hazard boundary.
* **Safe Buffer Zone (Green):** Bounded safe standoff distance.


* **Parametric Re-Simulation:** Real-time sensitivity controls for tank diameter, height, wind origin bearing, and velocity with dynamic $P(\text{Blast})$ risk recalculation.
* **Tactical Evacuation Corridors:** Automated waypoint routing rendering clear, obstacle-aware egress paths outside active plume sectors to designated safe staging zones.
* **Multi-Layer Base Cartography:** Toggleable Street Map, Dark Map, and Satellite visual layers for incident command awareness.

<img width="1600" height="1150" alt="image" src="https://github.com/user-attachments/assets/634e1749-2223-486a-baae-4a6dc768e0d5" />

---

## Technology Stack

### Client

* **Framework:** React 19
* **Bundler:** Vite
* **Styling:** Tailwind CSS (configured with `@tailwindcss/vite`)
* **Mapping:** Leaflet, React-Leaflet
* **Routing:** React Router DOM (v6+)

### Server & ML Services

* **API Framework:** FastAPI (Python)
* **Mathematical Operations:** NumPy, SciPy, Pandas
* **Spatial GeoJSON Engine:** Custom discrete cellular point-source calculators

---

## Project Directory Structure

```text
thermavector/
├── backend/
│   ├── main.py                     # FastAPI application entry point
│   ├── models/                     # Estimation schemas and ML pipelines
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── public/                     # Static production assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Primary navigation header
│   │   │   └── map/
│   │   │       ├── MapView.jsx     # Leaflet grid canvas & threat layers
│   │   │       └── MapView.css     # HUD, marker radar, and night theme styles
│   │   ├── pages/
│   │   │   ├── Home.jsx            # Command center intro & module navigation
│   │   │   ├── Configure.jsx       # Scenario input & facility configuration
│   │   │   ├── ThreatEstimatorMap.jsx # Real-time simulation map & diagnostics
│   │   │   └── Results.jsx         # 25m cellular grid exposure matrix dashboard
│   │   ├── App.jsx                 # Route definitions
│   │   ├── main.jsx                # DOM mounting & root entry point
│   │   └── index.css               # Global styling & Tailwind imports
│   ├── index.html                  # HTML entry template
│   ├── package.json                # Frontend package dependencies & scripts
│   ├── vite.config.js              # Vite build, plugin, and deduplication setup
│   └── vercel.json                 # Deployment routing & rewrite rules
└── README.md

```

---

## API Specification

### 1. Spatial Grid Threat Estimation

* **Endpoint:** `POST /api/v1/estimate`
* **Payload:**
```json
{
  "latitude": 13.0827,
  "longitude": 80.2707,
  "configuration": "single",
  "hazard_type": "thermal",
  "wind_speed_m_s": 8.0,
  "wind_direction_deg": 135.0,
  "tank_diameter_m": 20.0,
  "tank_height_m": 15.0,
  "fuel_mass_kg": 50000.0
}

```


* **Response:** Returns GeoJSON `FeatureCollection` composed of 25m cell polygons tagged with calculated heat/pressure intensities, downwind vectors, and severity zones.

### 2. Predictive Scenario Forecast

* **Endpoint:** `POST /api/predict-scenario`
* **Payload:**
```json
{
  "target_time": "2026-09-02 14:30:00",
  "lat": 13.0827,
  "lng": 80.2707,
  "fuel_mass_kg": 14000.0,
  "tank_diameter_m": 15.0,
  "wall_thickness_m": 0.015,
  "wind_speed_ms": 8.0,
  "wind_direction_deg": 135.0,
  "temperature_c": 32.0
}

```


* **Response:** Yields `environmental_forecast`, `threat_assessment` (hoop stress in Pa, time to failure in minutes), and bounded danger zone coordinates.

---

## Local Development Setup

### Prerequisites

* Node.js 18+ and npm
* Python 3.10+
* Git

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000

```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --force

```

The application will be available locally at `http://localhost:5173`.
