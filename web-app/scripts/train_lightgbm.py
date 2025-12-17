"""
LightGBM Sales Forecasting Model for Cafe
Fast, accurate, and production-ready
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
import lightgbm as lgb
import joblib
import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

def load_and_prepare_data(data_path='Dataset-creat/daily_cafe_dataset.csv'):
    """Load and prepare data with feature engineering"""
    df = pd.read_csv(data_path)
    df['day'] = pd.to_datetime(df['day'])
    df = df.sort_values('day').reset_index(drop=True)
    
    # Feature Engineering
    df['day_of_week'] = df['day'].dt.dayofweek
    df['day_of_month'] = df['day'].dt.day
    df['month'] = df['day'].dt.month
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    # Lag features (previous days) - reduced to 3 days for small datasets
    for lag in [1, 2, 3]:
        df[f'sales_lag_{lag}'] = df['total_sales'].shift(lag)
        df[f'orders_lag_{lag}'] = df['orders_count'].shift(lag)
        df[f'items_lag_{lag}'] = df['items_sold'].shift(lag)
    
    # Rolling averages - reduced windows for small datasets
    for window in [3, 7]:
        df[f'sales_rolling_{window}'] = df['total_sales'].rolling(window, min_periods=1).mean()
        df[f'orders_rolling_{window}'] = df['orders_count'].rolling(window, min_periods=1).mean()
        df[f'items_rolling_{window}'] = df['items_sold'].rolling(window, min_periods=1).mean()
    
    # Trend features - using 3-day trend for small datasets
    df['sales_trend'] = df['total_sales'].pct_change(periods=3).fillna(0)
    
    # Drop rows with NaN (from lags)
    df = df.dropna()
    
    return df

def train_lightgbm_model(df, target_col='total_sales'):
    """Train LightGBM model with time series cross-validation"""
    
    # Prepare features
    feature_cols = [col for col in df.columns if col not in ['day', target_col, 'orders_count', 'items_sold', 'total_expenses', 'receipt_expenses', 'cash_sales', 'order_sales', 'discounts', 'evening_shift_sales', 'morning_shift_sales', 'inventory_waste_qty', 'inventory_usage_qty', 'average_order_value', 'gross_profit', 'profit_margin', 'cash_ratio']]
    X = df[feature_cols]
    y = df[target_col]
    
    print(f"Training on {len(X)} samples with {len(feature_cols)} features")
    print(f"Features: {feature_cols[:10]}...")
    
    # LightGBM model
    model = lgb.LGBMRegressor(
        n_estimators=2000,
        learning_rate=0.03,
        num_leaves=64,
        max_depth=8,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        verbose=-1
    )
    
    # Time Series Cross-Validation
    tscv = TimeSeriesSplit(n_splits=5)
    mae_scores = []
    mape_scores = []
    
    print("\nCross-Validation Results:")
    for fold, (train_idx, test_idx) in enumerate(tscv.split(X), 1):
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        
        model.fit(X_train, y_train)
        pred = model.predict(X_test)
        
        mae = mean_absolute_error(y_test, pred)
        mape = mean_absolute_percentage_error(y_test, pred) * 100
        
        mae_scores.append(mae)
        mape_scores.append(mape)
        
        print(f"Fold {fold}: MAE = {mae:,.0f} IQD, MAPE = {mape:.2f}%")
    
    print(f"\nAverage MAE: {np.mean(mae_scores):,.0f} IQD")
    print(f"Average MAPE: {np.mean(mape_scores):.2f}%")
    
    # Train final model on all data
    model.fit(X, y)
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Most Important Features:")
    print(feature_importance.head(10).to_string(index=False))
    
    return model, feature_cols, {
        'mae': np.mean(mae_scores),
        'mape': np.mean(mape_scores)
    }

def forecast_next_days(model, df, feature_cols, n_days=7):
    """Forecast sales for next N days"""
    last_row = df.iloc[-1].copy()
    forecasts = []
    
    for i in range(1, n_days + 1):
        # Prepare features for next day
        next_day = last_row['day'] + timedelta(days=i)
        features = {}
        
        # Date features
        features['day_of_week'] = next_day.dayofweek
        features['day_of_month'] = next_day.day
        features['month'] = next_day.month
        features['is_weekend'] = int(next_day.dayofweek >= 5)
        
        # Use last known values for lags and rolling features
        for col in feature_cols:
            if col not in features:
                if col in last_row:
                    features[col] = last_row[col]
                else:
                    features[col] = 0
        
        # Predict
        X_pred = pd.DataFrame([features])[feature_cols]
        prediction = model.predict(X_pred)[0]
        
        forecasts.append({
            'date': next_day.strftime('%Y-%m-%d'),
            'predicted_sales': float(prediction),
            'day_of_week': next_day.strftime('%A')
        })
    
    return forecasts

def save_model(model, feature_cols, metrics, output_dir='Dataset-creat/models'):
    """Save model and metadata"""
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Save model
    model_path = f"{output_dir}/lightgbm_sales_model.pkl"
    joblib.dump(model, model_path)
    print(f"\nModel saved to: {model_path}")
    
    # Save metadata
    metadata = {
        'model_type': 'LightGBM',
        'target': 'total_sales',
        'features': feature_cols,
        'metrics': metrics,
        'trained_at': datetime.now().isoformat()
    }
    
    metadata_path = f"{output_dir}/lightgbm_metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"Metadata saved to: {metadata_path}")

if __name__ == "__main__":
    print("=" * 60)
    print("LightGBM Sales Forecasting - Cafe Management")
    print("=" * 60)
    
    # Load data
    print("\n1. Loading and preparing data...")
    df = load_and_prepare_data()
    print(f"Loaded {len(df)} days of data")
    
    # Train model
    print("\n2. Training LightGBM model...")
    model, feature_cols, metrics = train_lightgbm_model(df)
    
    # Forecast
    print("\n3. Generating 7-day forecast...")
    forecasts = forecast_next_days(model, df, feature_cols, n_days=7)
    
    print("\nForecast for next 7 days:")
    for f in forecasts:
        print(f"  {f['date']} ({f['day_of_week']}): {f['predicted_sales']:,.0f} IQD")
    
    # Save
    print("\n4. Saving model...")
    save_model(model, feature_cols, metrics)
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print("=" * 60)
