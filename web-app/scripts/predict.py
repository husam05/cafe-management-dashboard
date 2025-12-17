import json
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
import joblib
import os
import sys
import argparse
from datetime import datetime, timedelta

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '../tf_model.h5')
SCALER_PATH = os.path.join(BASE_DIR, '../scaler.pkl')
DATA_PATH = os.path.join(BASE_DIR, '../../cafe_management.json')

def load_resources():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(SCALER_PATH):
        print("Error: Model or Scaler not found. Please train the model first.")
        sys.exit(1)
    
    model = keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    return model, scaler

def load_historical_data():
    if not os.path.exists(DATA_PATH):
        return pd.DataFrame()
        
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    receipts_data = []
    if isinstance(data, list):
        for table in data:
            if table.get('type') == 'table' and table.get('name') == 'DailyReceipts':
                receipts_data = table.get('data', [])
                break
                
    df = pd.DataFrame(receipts_data)
    if not df.empty:
        df['receiptDate'] = pd.to_datetime(df['receiptDate'])
        df['totalSales'] = pd.to_numeric(df['totalSales'], errors='coerce').fillna(0)
        df = df.sort_values('receiptDate')
    return df

def analyze_trends(df):
    if len(df) < 2:
        return "لا توجد بيانات كافية لتحليل الاتجاهات."
        
    # Calculate simple linear trend (slope)
    x = np.arange(len(df))
    y = df['totalSales'].values
    slope, _ = np.polyfit(x, y, 1)
    
    avg_sales = df['totalSales'].mean()
    
    trend = "مستقر"
    if slope > avg_sales * 0.05: trend = "نمو قوي 🚀"
    elif slope > 0: trend = "نمو طفيف 📈"
    elif slope < -avg_sales * 0.05: trend = "انخفاض 📉"
    elif slope < 0: trend = "انخفاض طفيف 📉"
    
    return trend

def detect_anomalies(df):
    if len(df) < 5:
        return []
    
    # Group by date first to handle multiple shifts per day
    daily_df = df.groupby(df['receiptDate'].dt.date)['totalSales'].sum().reset_index()
    daily_df['receiptDate'] = pd.to_datetime(daily_df['receiptDate'])
    
    mean = daily_df['totalSales'].mean()
    std = daily_df['totalSales'].std()
    threshold = 1.5 * std # 1.5 sigma
    
    anomalies = []
    for _, row in daily_df.iterrows():
        diff = row['totalSales'] - mean
        if abs(diff) > threshold:
            type_ = "ارتفاع مفاجئ 🟢" if diff > 0 else "انخفاض مفاجئ 🔴"
            anomalies.append(f"{row['receiptDate'].strftime('%Y-%m-%d')}: {type_} ({row['totalSales']:,.0f} IQD)")
            
    return anomalies[-3:] # Return last 3

def predict_future(model, scaler, days=3):
    today = datetime.now()
    future_dates = [today + timedelta(days=i) for i in range(1, days + 1)]
    
    data = []
    for date in future_dates:
        data.append({
            'day_of_week': date.weekday(),
            'month': date.month,
            'day': date.day,
            'date_str': date.strftime('%Y-%m-%d')
        })
        
    df_pred = pd.DataFrame(data)
    X = df_pred[['day_of_week', 'month', 'day']]
    X_scaled = scaler.transform(X)
    
    predictions = model.predict(X_scaled, verbose=0)
    
    results = []
    for i, pred in enumerate(predictions):
        results.append({
            'date': df_pred.iloc[i]['date_str'],
            'sales': max(0, float(pred[0])) # No negative sales
        })
    return results

def analyze_products(data):
    # Retrieve OrderItems and MenuItems from full raw data
    orders = []
    menu = {}
    
    if isinstance(data, list):
        for table in data:
            if table.get('name') == 'MenuItems':
                for m in table.get('data', []):
                    menu[m['idMenuItem']] = m['itemName']
            if table.get('name') == 'OrderItems':
                orders = table.get('data', [])
            
    if not orders:
        return ""
        
    counts = {}
    for o in orders:
        mid = o['menuItemId']
        qty = int(float(o['quantity'])) if o['quantity'] else 0
        counts[mid] = counts.get(mid, 0) + qty
        
    sorted_items = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
    
    report = "\n## 🏆 المنتجات الأكثر مبيعاً\n"
    report += "| المنتج | الكمية |\n|---|---|\n"
    for mid, count in sorted_items:
        name = menu.get(mid, f"Unknown ({mid})")
        report += f"| {name} | {count} |\n"
        
    return report

def analyze_peak_hours(data):
    orders = []
    if isinstance(data, list):
         for table in data:
            if table.get('name') == 'OrderItems':
                orders = table.get('data', [])
            
    if not orders:
        return ""
        
    hours = {}
    for o in orders:
        try:
            dt = pd.to_datetime(o['createdAt'])
            h = dt.hour
            hours[h] = hours.get(h, 0) + 1
        except:
            pass
            
    sorted_hours = sorted(hours.items(), key=lambda x: x[1], reverse=True)[:3]
    
    report = "\n## ⏰ أوقات الذروة (الأكثر ازدحاماً)\n"
    for h, count in sorted_hours:
        ampm = "صباحاً" if h < 12 else "مساءً"
        h_12 = h if h <= 12 else h - 12
        h_12 = 12 if h_12 == 0 else h_12
        report += f"- **{h_12} {ampm}**: {count} طلب\n"
        
    return report

def generate_report(prompt):
    model, scaler = load_resources()
    
    # Reload raw data for deep analysis
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        full_data = json.load(f)
        
    df_history = load_historical_data()
    
    # 1. Forecast
    forecast = predict_future(model, scaler, 3)
    
    # 2. Analysis
    trend = analyze_trends(df_history)
    anomalies = detect_anomalies(df_history)
    avg_sales = df_history['totalSales'].mean() if not df_history.empty else 0
    
    # Generate Markdown
    report = f"# 🧠 تقرير ذكاء الأعمال الشامل\n\n"
    report += f"**النموذج:** شبكة عصبية TensorFlow (V2.0)\n"
    report += f"**الحالة:** {trend}\n\n"
    
    report += "## 🔮 توقعات المبيعات (الأيام الـ 3 القادمة)\n"
    report +=("| التاريخ | المبيعات المتوقعة |\n|---|---|\n")
    for item in forecast:
        report += f"| {item['date']} | **{item['sales']:,.0f} IQD** |\n"
        
    report += "\n## 📊 تحليل الأداء المالي\n"
    report += f"- **متوسط المبيعات اليومية:** {avg_sales:,.0f} IQD\n"
    
    # New Deep Analysis
    report += analyze_products(full_data)
    report += analyze_peak_hours(full_data)
    
    if anomalies:
        report += "\n## ⚠️ كشف الشذوذ (تنبيهات)\n"
        for a in anomalies:
            report += f"- {a}\n"
        
    report += "\n## 💡 توصية استراتيجية\n"
    total_forecast = sum(f['sales'] for f in forecast)
    
    if "نمو" in trend:
         report += "الأداء الحالي ممتاز ويتجاوز المتوسط. استثمر في تسويق المنتجات " + \
                   "الأكثر مبيعاً لتعزيز الزخم."
    elif total_forecast > avg_sales * 3.5: 
         report += "من المتوقع حركة مرور عالية. تأكد من توفر مخزون كافٍ."
    else:
         report += "المبيعات أقل من المتوسط. راجع أوقات الذروة وقدم عروضاً خاصة " + \
                   "في الساعات الهادئة لتنشيط الحركة."
                   
    return report

if __name__ == "__main__":
    # Suppress TF logs
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    
    parser = argparse.ArgumentParser()
    parser.add_argument("prompt", help="User query", nargs='?', default="forecast")
    args = parser.parse_args()
    
    try:
        if "tensorflow" in args.prompt.lower() or True: # Always use this logic for now as it replaces old one
             print(generate_report(args.prompt))
    except Exception as e:
        print(f"Error generating insight: {str(e)}")
        sys.exit(1)
