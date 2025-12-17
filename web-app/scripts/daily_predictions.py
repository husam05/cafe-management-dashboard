"""
Daily Prediction Pipeline
Runs daily to generate forecasts and recommendations
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

def load_model(model_path='Dataset-creat/models/lightgbm_sales_model.pkl'):
    """Load trained model"""
    return joblib.load(model_path)

def load_metadata(metadata_path='Dataset-creat/models/lightgbm_metadata.json'):
    """Load model metadata"""
    with open(metadata_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_latest_data(data_path='Dataset-creat/daily_cafe_dataset.csv'):
    """Load latest data from database export"""
    df = pd.read_csv(data_path)
    df['day'] = pd.to_datetime(df['day'])
    df = df.sort_values('day').reset_index(drop=True)
    
    # Same feature engineering as training
    df['day_of_week'] = df['day'].dt.dayofweek
    df['day_of_month'] = df['day'].dt.day
    df['month'] = df['day'].dt.month
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    for lag in [1, 2, 3]:
        df[f'sales_lag_{lag}'] = df['total_sales'].shift(lag)
        df[f'orders_lag_{lag}'] = df['orders_count'].shift(lag)
        df[f'items_lag_{lag}'] = df['items_sold'].shift(lag)
    
    for window in [3, 7]:
        df[f'sales_rolling_{window}'] = df['total_sales'].rolling(window, min_periods=1).mean()
        df[f'orders_rolling_{window}'] = df['orders_count'].rolling(window, min_periods=1).mean()
        df[f'items_rolling_{window}'] = df['items_sold'].rolling(window, min_periods=1).mean()
    
    df['sales_trend'] = df['total_sales'].pct_change(periods=3).fillna(0)
    df = df.dropna()
    
    return df

def generate_predictions(model, df, feature_cols, n_days=7):
    """Generate predictions for next N days"""
    last_row = df.iloc[-1].copy()
    predictions = []
    
    for i in range(1, n_days + 1):
        next_day = last_row['day'] + timedelta(days=i)
        features = {}
        
        features['day_of_week'] = next_day.dayofweek
        features['day_of_month'] = next_day.day
        features['month'] = next_day.month
        features['is_weekend'] = int(next_day.dayofweek >= 5)
        
        for col in feature_cols:
            if col not in features:
                features[col] = last_row[col] if col in last_row else 0
        
        X_pred = pd.DataFrame([features])[feature_cols]
        predicted_sales = model.predict(X_pred)[0]
        
        predictions.append({
            'date': next_day.strftime('%Y-%m-%d'),
            'day_name': next_day.strftime('%A'),
            'predicted_sales': float(predicted_sales),
            'confidence': 'high' if next_day.dayofweek < 5 else 'medium'
        })
    
    return predictions

def generate_recommendations(predictions, df):
    """Generate actionable recommendations"""
    recommendations = []
    
    # Calculate average sales
    avg_sales = df['total_sales'].tail(30).mean()
    
    # Check for high-demand days
    for pred in predictions:
        if pred['predicted_sales'] > avg_sales * 1.2:
            recommendations.append({
                'type': 'high_demand',
                'date': pred['date'],
                'message': f"توقع مبيعات عالية ({pred['predicted_sales']:,.0f} IQD). تأكد من توفر المخزون الكافي.",
                'priority': 'high'
            })
        elif pred['predicted_sales'] < avg_sales * 0.7:
            recommendations.append({
                'type': 'low_demand',
                'date': pred['date'],
                'message': f"توقع مبيعات منخفضة ({pred['predicted_sales']:,.0f} IQD). قلل الطلبات لتجنب الهدر.",
                'priority': 'medium'
            })
    
    return recommendations

def save_predictions(predictions, recommendations, output_path='predictions_daily.json'):
    """Save predictions to file"""
    output = {
        'generated_at': datetime.now().isoformat(),
        'predictions': predictions,
        'recommendations': recommendations,
        'summary': {
            'total_predicted_sales': sum(p['predicted_sales'] for p in predictions),
            'avg_daily_sales': sum(p['predicted_sales'] for p in predictions) / len(predictions),
            'high_demand_days': len([r for r in recommendations if r['type'] == 'high_demand'])
        }
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Predictions saved to: {output_path}")
    return output

if __name__ == "__main__":
    print("=" * 60)
    print("Daily Prediction Pipeline")
    print("=" * 60)
    
    try:
        # Load model
        print("\n1. Loading model...")
        model = load_model()
        metadata = load_metadata()
        print(f"Model trained at: {metadata['trained_at']}")
        print(f"Model MAE: {metadata['metrics']['mae']:,.0f} IQD")
        
        # Load data
        print("\n2. Loading latest data...")
        df = load_latest_data()
        print(f"Loaded {len(df)} days of data")
        print(f"Latest date: {df['day'].max()}")
        
        # Generate predictions
        print("\n3. Generating predictions...")
        predictions = generate_predictions(model, df, metadata['features'], n_days=7)
        
        print("\n7-Day Forecast:")
        for p in predictions:
            print(f"  {p['date']} ({p['day_name']}): {p['predicted_sales']:,.0f} IQD")
        
        # Generate recommendations
        print("\n4. Generating recommendations...")
        recommendations = generate_recommendations(predictions, df)
        
        if recommendations:
            print(f"\nFound {len(recommendations)} recommendations:")
            for r in recommendations:
                print(f"  [{r['priority'].upper()}] {r['message']}")
        else:
            print("\nNo special recommendations for the forecast period.")
        
        # Save
        print("\n5. Saving predictions...")
        output = save_predictions(predictions, recommendations)
        
        print("\n" + "=" * 60)
        print("Pipeline Complete!")
        print(f"Total predicted sales (7 days): {output['summary']['total_predicted_sales']:,.0f} IQD")
        print("=" * 60)
        
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
