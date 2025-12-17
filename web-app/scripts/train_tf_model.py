import json
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import os
import sys

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '../../cafe_management.json')
MODEL_PATH = os.path.join(BASE_DIR, '../tf_model.h5')
SCALER_PATH = os.path.join(BASE_DIR, '../scaler.pkl')

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
    df['totalSales'] = pd.to_numeric(df['totalSales'], errors='coerce').fillna(0)
    
    # Filter valid sales
    df = df[df['totalSales'] > 0]
    
    # Feature Engineering
    df['day_of_week'] = df['receiptDate'].dt.dayofweek
    df['month'] = df['receiptDate'].dt.month
    df['day'] = df['receiptDate'].dt.day
    
    # Select features
    X = df[['day_of_week', 'month', 'day']]
    y = df['totalSales']
    
    return X, y

def train():
    print("Loading data...")
    df = load_data()
    X, y = preprocess_data(df)
    
    print(f"Training on {len(X)} records.")
    
    # Split
    if len(X) < 10:
         X_train, X_test, y_train, y_test = X, X, y, y
    else:
         X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale Data (Important for Neural Networks)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save Scaler
    joblib.dump(scaler, SCALER_PATH)
    
    # Build Model
    model = keras.Sequential([
        layers.Dense(64, activation='relu', input_shape=[X_train.shape[1]]),
        layers.Dense(32, activation='relu'),
        layers.Dense(1) # Linear output for regression
    ])
    
    optimizer = tf.keras.optimizers.RMSprop(0.001)
    model.compile(loss='mse', optimizer=optimizer, metrics=['mae', 'mse'])
    
    # Train
    EPOCHS = 500
    print(f"Training for {EPOCHS} epochs...")
    history = model.fit(
        X_train_scaled, y_train,
        epochs=EPOCHS, validation_split=0.2, verbose=0
    )
    
    # Evaluate
    loss, mae, mse = model.evaluate(X_test_scaled, y_test, verbose=0)
    print(f"Model Performance - MAE: {mae:,.2f} IQD")
    
    # Save
    print(f"Saving model to {MODEL_PATH}...")
    model.save(MODEL_PATH)
    print("Done.")

if __name__ == "__main__":
    train()
