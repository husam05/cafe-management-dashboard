"""
Cafe Sales Forecasting Model Training
=====================================
Given the small dataset (20 days), we use:
1. ARIMA - Traditional time series (best for small data)
2. Linear Regression with lag features
3. Random Forest (if enough features)
"""

import pandas as pd
import numpy as np
import os
import warnings
import pickle
from datetime import datetime

warnings.filterwarnings('ignore')

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, 'daily_cafe_dataset.csv')
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')

os.makedirs(MODEL_DIR, exist_ok=True)


def load_data():
    """Load and prepare the dataset."""
    print("📂 Loading dataset...")
    df = pd.read_csv(DATASET_PATH, index_col='day', parse_dates=True)
    df = df.sort_index()
    
    print(f"   Shape: {df.shape}")
    print(f"   Date range: {df.index.min()} to {df.index.max()}")
    print(f"   Target (total_sales) stats:")
    print(f"      Mean: {df['total_sales'].mean():,.0f}")
    print(f"      Std:  {df['total_sales'].std():,.0f}")
    
    return df


def train_arima(df):
    """Train ARIMA model for time series forecasting."""
    print("\n🔮 Training ARIMA Model...")
    
    try:
        from statsmodels.tsa.arima.model import ARIMA
        from statsmodels.tsa.stattools import adfuller
    except ImportError:
        print("   ❌ statsmodels not installed. Run: pip install statsmodels")
        return None, None
    
    y = df['total_sales']
    
    # Check stationarity
    adf_result = adfuller(y.dropna())
    print(f"   ADF Statistic: {adf_result[0]:.4f}")
    print(f"   p-value: {adf_result[1]:.4f}")
    
    if adf_result[1] > 0.05:
        print("   ⚠️ Series is non-stationary, using differencing (d=1)")
        d = 1
    else:
        print("   ✅ Series is stationary")
        d = 0
    
    # Train/test split (last 3 days for testing)
    train_size = len(y) - 3
    train, test = y[:train_size], y[train_size:]
    
    print(f"   Train size: {len(train)}, Test size: {len(test)}")
    
    # Fit ARIMA - try different orders
    best_aic = float('inf')
    best_order = (1, d, 1)
    best_model = None
    
    for p in range(0, 3):
        for q in range(0, 3):
            try:
                model = ARIMA(train, order=(p, d, q))
                fitted = model.fit()
                if fitted.aic < best_aic:
                    best_aic = fitted.aic
                    best_order = (p, d, q)
                    best_model = fitted
            except:
                continue
    
    print(f"   Best order: ARIMA{best_order} (AIC: {best_aic:.2f})")
    
    # Forecast
    forecast = best_model.forecast(steps=len(test))
    
    # Evaluate
    mae = np.mean(np.abs(test.values - forecast.values))
    mape = np.mean(np.abs((test.values - forecast.values) / test.values)) * 100
    
    print(f"\n   📊 ARIMA Results:")
    print(f"      MAE:  {mae:,.0f}")
    print(f"      MAPE: {mape:.1f}%")
    
    # Save model
    model_path = os.path.join(MODEL_DIR, 'arima_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump({'model': best_model, 'order': best_order}, f)
    print(f"   💾 Saved to {model_path}")
    
    return best_model, {'mae': mae, 'mape': mape}


def train_regression(df):
    """Train regression model with lag features."""
    print("\n📈 Training Regression Model...")
    
    try:
        from sklearn.linear_model import Ridge
        from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import TimeSeriesSplit
        from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
    except ImportError:
        print("   ❌ scikit-learn not installed. Run: pip install scikit-learn")
        return None, None
    
    # Dynamic Feature Engineering
    print("   ⚙️ Computing derived features...")
    df = df.copy()
    
    # 1. Lags
    df['lag_1_sales'] = df['total_sales'].shift(1)
    df['lag_7_sales'] = df['total_sales'].shift(7)
    
    # 2. Rolling Statistics
    df['rolling_7d_sales_avg'] = df['total_sales'].rolling(window=7, min_periods=1).mean()
    df['rolling_30d_sales_avg'] = df['total_sales'].rolling(window=30, min_periods=1).mean()
    
    # 3. Calendar Features (Already in CSV but ensuring type)
    if 'day_of_week' not in df.columns:
         df['day_of_week'] = df.index.dayofweek
    if 'is_weekend' not in df.columns:
         df['is_weekend'] = df.index.dayofweek.isin([4, 5]).astype(int) # Friday/Saturday
         
    # Drop NaN from lags (still need lags, so we lose first 7 days if lag_7 is used)
    # With 27 days, losing 7 is fine (20 left).
    df.dropna(inplace=True)

    # Feature selection
    feature_cols = [
        'lag_1_sales', 'lag_7_sales', 
        'rolling_7d_sales_avg', 'rolling_30d_sales_avg',
        'day_of_week', 'is_weekend'
    ]
    
    # Verify these columns exist
    feature_cols = [c for c in feature_cols if c in df.columns]
    
    print(f"   Features used: {len(feature_cols)} ({', '.join(feature_cols)})")
    
    X = df[feature_cols].copy()
    y = df['total_sales'].copy()
    
    # Train/test split
    train_size = len(df) - 3
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train multiple models
    models = {
        'Ridge': Ridge(alpha=1.0),
        'RandomForest': RandomForestRegressor(n_estimators=50, max_depth=3, random_state=42),
        'GradientBoosting': GradientBoostingRegressor(n_estimators=50, max_depth=2, random_state=42)
    }
    
    best_model = None
    best_name = None
    best_mae = float('inf')
    
    for name, model in models.items():
        model.fit(X_train_scaled, y_train)
        preds = model.predict(X_test_scaled)
        mae = mean_absolute_error(y_test, preds)
        
        print(f"   {name}: MAE = {mae:,.0f}")
        
        if mae < best_mae:
            best_mae = mae
            best_model = model
            best_name = name
    
    # Final evaluation
    final_preds = best_model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, final_preds)
    mape = mean_absolute_percentage_error(y_test, final_preds) * 100
    
    print(f"\n   📊 Best Model: {best_name}")
    print(f"      MAE:  {mae:,.0f}")
    print(f"      MAPE: {mape:.1f}%")
    
    # Feature importance (if available)
    if hasattr(best_model, 'feature_importances_'):
        importance = pd.DataFrame({
            'feature': feature_cols,
            'importance': best_model.feature_importances_
        }).sort_values('importance', ascending=False)
        print(f"\n   🎯 Top Features:")
        for _, row in importance.head(5).iterrows():
            print(f"      {row['feature']}: {row['importance']:.3f}")
    
    # Save model
    model_path = os.path.join(MODEL_DIR, 'regression_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': best_model,
            'scaler': scaler,
            'features': feature_cols,
            'name': best_name
        }, f)
    print(f"   💾 Saved to {model_path}")
    
    return best_model, {'mae': mae, 'mape': mape, 'name': best_name}


def train_prophet(df):
    """Train Facebook Prophet model (good for small seasonal data)."""
    print("\n🌙 Training Prophet Model...")
    
    try:
        from prophet import Prophet
    except ImportError:
        print("   ⚠️ Prophet not installed. Skipping. (pip install prophet)")
        return None, None
    
    # Prepare data for Prophet
    prophet_df = df.reset_index()[['day', 'total_sales']].copy()
    prophet_df.columns = ['ds', 'y']
    
    # Train/test split
    train_size = len(prophet_df) - 3
    train = prophet_df[:train_size]
    test = prophet_df[train_size:]
    
    # Fit model
    model = Prophet(
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False,
        changepoint_prior_scale=0.05  # More regularization for small data
    )
    model.fit(train)
    
    # Forecast
    future = model.make_future_dataframe(periods=3)
    forecast = model.predict(future)
    
    # Evaluate
    preds = forecast.tail(3)['yhat'].values
    actuals = test['y'].values
    
    mae = np.mean(np.abs(actuals - preds))
    mape = np.mean(np.abs((actuals - preds) / actuals)) * 100
    
    print(f"   📊 Prophet Results:")
    print(f"      MAE:  {mae:,.0f}")
    print(f"      MAPE: {mape:.1f}%")
    
    # Save model
    model_path = os.path.join(MODEL_DIR, 'prophet_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"   💾 Saved to {model_path}")
    
    return model, {'mae': mae, 'mape': mape}


def forecast_next_days(df, days=7):
    """Generate forecasts for next N days using the best available model."""
    print(f"\n🔮 Forecasting next {days} days...")
    
    future_dates = pd.date_range(start=df.index.max() + pd.Timedelta(days=1), periods=days)
    forecast_values = []
    
    # Try to load Regression model first (usually better)
    reg_path = os.path.join(MODEL_DIR, 'regression_model.pkl')
    if os.path.exists(reg_path):
        print("   Using Regression Model for forecasting...")
        with open(reg_path, 'rb') as f:
            model_data = pickle.load(f)
            model = model_data['model']
            scaler = model_data['scaler']
            feature_cols = model_data['features']
            
        # Prepare data for recursive forecasting
        # We need a history buffer to calculate lags and rolling means
        history_df = df.copy()
        
        for date in future_dates:
            # Create features for this date
            row = {}
            
            # 1. Calendar features
            row['day_of_week'] = date.dayofweek
            row['is_weekend'] = 1 if date.dayofweek >= 4 else 0 # Assuming Fri/Sat weekend or similar
            
            # 2. Lag features
            # We need to ensure we have enough history
            if 'lag_1_sales' in feature_cols:
                row['lag_1_sales'] = history_df.iloc[-1]['total_sales']
            
            if 'lag_7_sales' in feature_cols:
                if len(history_df) >= 7:
                    row['lag_7_sales'] = history_df.iloc[-7]['total_sales']
                else:
                    row['lag_7_sales'] = history_df['total_sales'].mean() # Fallback
            
            # 3. Rolling features
            if 'rolling_7d_sales_avg' in feature_cols:
                row['rolling_7d_sales_avg'] = history_df['total_sales'].tail(7).mean()
                
            if 'rolling_30d_sales_avg' in feature_cols:
                row['rolling_30d_sales_avg'] = history_df['total_sales'].tail(30).mean()
            
            # Construct feature vector
            X_new = pd.DataFrame([row])[feature_cols]
            X_scaled = scaler.transform(X_new)
            
            # Predict
            pred = model.predict(X_scaled)[0]
            forecast_values.append(pred)
            
            # Append to history for next iteration
            new_row = pd.DataFrame({'total_sales': [pred]}, index=[date])
            history_df = pd.concat([history_df, new_row])
            
    # Fallback to ARIMA if Regression not found
    elif os.path.exists(os.path.join(MODEL_DIR, 'arima_model.pkl')):
        print("   Using ARIMA Model for forecasting...")
        with open(os.path.join(MODEL_DIR, 'arima_model.pkl'), 'rb') as f:
            arima_data = pickle.load(f)
        
        from statsmodels.tsa.arima.model import ARIMA
        y = df['total_sales']
        model = ARIMA(y, order=arima_data['order'])
        fitted = model.fit()
        forecast_values = fitted.forecast(steps=days).values
        
    else:
        print("   ❌ No trained models found!")
        return None

    # Display and return results
    print("\n   📅 Forecast Results:")
    print("   " + "-" * 35)
    for date, pred in zip(future_dates, forecast_values):
        print(f"   {date.strftime('%Y-%m-%d')} ({date.strftime('%A')[:3]}): {pred:>12,.0f}")
    print("   " + "-" * 35)
    print(f"   Total forecast: {sum(forecast_values):,.0f}")
    
    return pd.DataFrame({
        'date': future_dates,
        'predicted_sales': forecast_values
    })


def main():
    print("=" * 50)
    print("☕ CAFE SALES FORECASTING - MODEL TRAINING")
    print("=" * 50)
    
    # Load data
    df = load_data()
    
    if len(df) < 10:
        print("\n❌ Not enough data for training (need at least 10 days)")
        return
    
    results = {}
    
    # Train ARIMA
    arima_model, arima_metrics = train_arima(df)
    if arima_metrics:
        results['ARIMA'] = arima_metrics
    
    # Train Regression
    reg_model, reg_metrics = train_regression(df)
    if reg_metrics:
        results['Regression'] = reg_metrics
    
    # Train Prophet (optional)
    prophet_model, prophet_metrics = train_prophet(df)
    if prophet_metrics:
        results['Prophet'] = prophet_metrics
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 MODEL COMPARISON")
    print("=" * 50)
    
    if results:
        comparison = pd.DataFrame(results).T
        comparison = comparison.sort_values('mape')
        print(comparison.to_string())
        
        best = comparison.index[0]
        print(f"\n🏆 Best Model: {best} (MAPE: {comparison.loc[best, 'mape']:.1f}%)")
    
    # Generate forecast
    forecast_df = forecast_next_days(df, days=7)
    
    if forecast_df is not None:
        forecast_path = os.path.join(SCRIPT_DIR, 'sales_forecast.csv')
        forecast_df.to_csv(forecast_path, index=False)
        print(f"\n💾 Forecast saved to {forecast_path}")
    
    print("\n✅ Training complete!")


if __name__ == "__main__":
    main()
