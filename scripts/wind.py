import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore') # Suppress minor datetime warnings

# 1. LOAD DATA using read_excel instead of read_csv
file_path = r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\wind.csv"
try:
    # We use engine='openpyxl' to force reading it as an Excel format
    data = pd.read_excel(file_path, engine='openpyxl')
except Exception as e:
    print(f"Failed to read data: {e}")
    exit()

# 2. PREPARE THE TIMESTAMPS
# The data is already loaded as datetime by read_excel, but we ensure it here
data['timestamp'] = pd.to_datetime(data['timestamp'])

# Extract time-based features
data['month'] = data['timestamp'].dt.month
data['day'] = data['timestamp'].dt.day
data['hour'] = data['timestamp'].dt.hour
data['minute'] = data['timestamp'].dt.minute

# 3. DEFINE FEATURES AND TARGETS
# Let's predict wind_speed and wind_direction based on time, temp, and humidity
X = data[['month', 'day', 'hour', 'minute', 'temperature', 'humidity']]
y = data[['wind_speed', 'wind_direction']]

# Split into training and testing sets to verify accuracy
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. TRAIN THE MODEL
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate model accuracy on the test set
predictions = model.predict(X_test)
mae_speed = mean_absolute_error(y_test['wind_speed'], predictions[:, 0])
mae_dir = mean_absolute_error(y_test['wind_direction'], predictions[:, 1])

print("Model trained successfully!")
print(f"Test MAE - Wind Speed: {mae_speed:.2f}")
print(f"Test MAE - Wind Direction: {mae_dir:.2f} degrees\n")

# 5. PREDICTION FUNCTION
def predict_conditions(input_datetime, temp, humidity):
    try:
        dt = pd.to_datetime(input_datetime)
        
        # Format the new data exactly like the training data
        input_features = pd.DataFrame({
            'month': [dt.month], 
            'day': [dt.day], 
            'hour': [dt.hour], 
            'minute': [dt.minute],
            'temperature': [temp],
            'humidity': [humidity]
        })
        
        prediction = model.predict(input_features)
        
        print(f"--- Predictions for {input_datetime} ---")
        print(f"Predicted Wind Speed: {prediction[0][0]:.2f}")
        print(f"Predicted Wind Direction: {prediction[0][1]:.2f} degrees")
        
    except Exception as e:
        print(f"Error making prediction: {e}")

# --- Test a Prediction ---
# Format: predict_conditions('YYYY-MM-DD HH:MM:SS', temperature, humidity)
predict_conditions('2026-09-02 14:30:00', 25.5, 60)