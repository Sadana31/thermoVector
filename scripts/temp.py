import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

# 1. LOAD DATA using read_csv
file_path = r"C:\Users\sadan\Desktop\threat-zone-estimator\scripts\temp.csv"

try:
    # We use read_csv with safe fallback parameters just in case of weird characters
    data = pd.read_csv(
        file_path, 
        encoding='utf-8', 
        encoding_errors='replace', 
        on_bad_lines='skip'
    )
    print("Data loaded successfully!\n")
except Exception as e:
    print(f"Failed to read data: {e}")
    exit()

# 2. PREPARE TIMESTAMPS
# Convert to datetime (Format: YYYY-MM-DD HH:MM:SS)
data['timestamp'] = pd.to_datetime(data['timestamp'])

# Extract high-resolution time features
data['month'] = data['timestamp'].dt.month
data['day'] = data['timestamp'].dt.day
data['hour'] = data['timestamp'].dt.hour
data['minute'] = data['timestamp'].dt.minute

# 3. DEFINE FEATURES AND TARGETS
# Predicting humidity and temperature based on exact time
X = data[['month', 'day', 'hour', 'minute']]
y = data[['humidity', 'temperature']]

# Split to test accuracy
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 4. TRAIN THE MODEL
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Check Accuracy
predictions = model.predict(X_test)
mae_hum = mean_absolute_error(y_test['humidity'], predictions[:, 0])
mae_temp = mean_absolute_error(y_test['temperature'], predictions[:, 1])

print(f"Test MAE - Humidity: {mae_hum:.2f}%")
print(f"Test MAE - Temperature: {mae_temp:.2f}°C\n")

# 5. PREDICTION FUNCTION
def predict_weather(input_datetime):
    try:
        dt = pd.to_datetime(input_datetime)
        
        # Format the input for the model
        input_features = pd.DataFrame({
            'month': [dt.month], 
            'day': [dt.day], 
            'hour': [dt.hour], 
            'minute': [dt.minute]
        })
        
        prediction = model.predict(input_features)
        
        print(f"--- Predictions for {input_datetime} ---")
        print(f"Predicted Humidity: {prediction[0][0]:.2f}%")
        print(f"Predicted Temperature: {prediction[0][1]:.2f}°C")
        
    except Exception as e:
        print(f"Error making prediction. Details: {e}")

# --- Test a Prediction ---
# Test an arbitrary time based on your dataset
predict_weather('2025-09-04 12:30:00')