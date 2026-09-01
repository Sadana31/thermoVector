import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

df = pd.read_csv(r'C:\Users\sadan\Desktop\threat-zone-estimator\scripts\tank_snapshots.csv')

# --- 2. PHYSICS FEATURE ENGINEERING ---

# Equation: Antoine Equation (Calculates internal vapor pressure)
# Constants for Propane (P in bar, T in Celsius)
A, B, C = 4.00272, 806.794, 259.3
df['vapor_pressure_bar'] = 10 ** (A - (B / (df['temperature_c'] + C)))

# Equation: Barlow's Formula (Calculates mechanical Hoop Stress on the cylinder)
# sigma = (P * r) / t
df['hoop_stress_pa'] = (df['vapor_pressure_bar'] * 100000 * (df['tank_diameter_m'] / 2)) / df['wall_thickness_m']

# Equation: TNT Equivalence (Calculates blast energy based on fuel mass)
# Mass * (Heat of Combustion of Propane ~46 MJ/kg) / (Energy of TNT ~4.184 MJ/kg) * 10% Yield Factor
df['tnt_equivalent_kg'] = (df['fuel_mass_kg'] * 46) / 4.184 * 0.1

# Equation: Hopkinson-Cranz Scaling Law (Calculates blast radius for specific severities)
# R = Z * (W ^ 1/3) -> where W is TNT mass and Z is scaled distance for overpressure thresholds
# Z = 4.8 (1 psi: Window breakage/Injury), Z = 1.0 (10 psi: Lethal structural destruction)
df['zone_lethal_radius_m'] = 1.0 * (df['tnt_equivalent_kg'] ** (1/3))
df['zone_injury_radius_m'] = 4.8 * (df['tnt_equivalent_kg'] ** (1/3))

# --- 3. ML TIME-TO-FAILURE PREDICTION ---

X = df[['temperature_c', 'wind_speed_ms', 'vapor_pressure_bar', 'hoop_stress_pa']]
y = df['time_to_failure_min']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# --- 4. REAL-TIME WARNING SYSTEM FUNCTION ---

def evaluate_tank_status(current_temp, current_mass, current_wind):
    # Calculate current physical state
    pressure = 10 ** (A - (B / (current_temp + C)))
    stress = (pressure * 100000 * (15.0 / 2)) / 0.015
    tnt_mass = (current_mass * 46) / 4.184 * 0.1
    
    # Predict countdown
    input_features = pd.DataFrame([[current_temp, current_wind, pressure, stress]], 
                                  columns=X.columns)
    time_left = model.predict(input_features)[0]
    
    print("\n🚨 TANK INTEGRITY WARNING SYSTEM 🚨")
    if time_left < 60:
        print(f"CRITICAL: Structural failure imminent in ~{time_left:.0f} minutes.")
    else:
        print(f"STATUS: Stable. Estimated time to critical stress: {time_left:.0f} minutes.")
        
    print(f"\nBlast Radius Projections (Fuel Load: {current_mass} kg):")
    print(f"  * Lethal Zone (10+ psi): {1.0 * (tnt_mass ** (1/3)):.1f} meters")
    print(f"  * Injury Zone (1+ psi):  {4.8 * (tnt_mass ** (1/3)):.1f} meters")

# Test a critical snapshot
evaluate_tank_status(current_temp=62.0, current_mass=14000, current_wind=2.0)