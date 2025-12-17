import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os
import sys

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '../../cafe_management.json')
MODEL_PATH = os.path.join(BASE_DIR, '../model.pkl')

def load_data():
    if not os.path.exists(DATA_PATH):
        print(f"Error: Data file not found at {DATA_PATH}")
        sys.exit(1)
        
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Extract DailyReceipts table
    receipts_data = []
    if isinstance(data, list):
        for table in data:
            if table.get('type') == 'table' and table.get('name') == 'DailyReceipts':
                receipts_data = table.get('data', [])
                break
    
    if not receipts_data:
        print("Error: DailyReceipts table not found or empty.")
        sys.exit(1)
        
    return pd.DataFrame(receipts_data)

def preprocess_data(df):
    # Convert types
    df['receiptDate'] = pd.to_datetime(df['receiptDate'])
    df['totalSales'] = pd.to_numeric(df['totalSales'])
    
    # Feature Engineering
    df['day_of_week'] = df['receiptDate'].dt.dayofweek
    df['month'] = df['receiptDate'].dt.month
    df['day'] = df['receiptDate'].dt.day
    df['is_weekend'] = df['day_of_week'].isin([4, 5]).astype(int) # Fri/Sat as weekend in some regions, or Sat/Sun. Let's assume generic Fri/Sat for now or just let model learn.
    
    # Select features
    X = df[['day_of_week', 'month', 'day']]
    y = df['totalSales']
    
    return X, y

def train():
    print("Loading data...")
    df = load_data()
    
    print(f"Found {len(df)} records.")
    
    # Pre-process types for filtering
    df['totalSales'] = pd.to_numeric(df['totalSales'], errors='coerce').fillna(0)
    
    # Filter out zero sales
    df = df[df['totalSales'] > 0]
    print(f"Training on {len(df)} records with valid sales.")
    
    X, y = preprocess_data(df)
    
    if len(X) < 10:
        print("Warning: Not enough data to split sensibly. Training on all data.")
        X_train, X_test, y_train, y_test = X, X, y, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Model
    print("Training Random Forest...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model Performance:")
    print(f"MSE: {mse:.2f}")
    print(f"R2: {r2:.2f}")
    
    # Save
    print(f"Saving model to {MODEL_PATH}...")
    joblib.dump(model, MODEL_PATH)
    print("Done.")

if __name__ == "__main__":
    train()
