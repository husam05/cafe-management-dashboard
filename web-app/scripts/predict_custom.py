"""
Enhanced AI Prediction Engine for Cafe Management
=================================================
Features:
- LightGBM integration for accurate forecasting
- Smart business recommendations
- Anomaly detection with Z-score
- Seasonal pattern analysis
- Product correlation analysis
- Confidence intervals for predictions
"""

import sys
import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

# Suppress warnings
import warnings
warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, '../Dataset-creat/models')
ARIMA_PATH = os.path.join(MODELS_DIR, 'arima_model.pkl')
REGRESSION_PATH = os.path.join(MODELS_DIR, 'regression_model.pkl')
LIGHTGBM_PATH = os.path.join(MODELS_DIR, 'lightgbm_sales_model.pkl')
LIGHTGBM_META_PATH = os.path.join(MODELS_DIR, 'lightgbm_metadata.json')
DATA_PATH = os.path.join(BASE_DIR, '../../cafe_management.json')


def load_data(file_path: Optional[str] = None) -> Dict:
    """Load and parse cafe data from JSON."""
    path_to_use = file_path if file_path else DATA_PATH
    
    try:
        with open(path_to_use, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        return {}
    
    result = {
        'DailyReceipts': [],
        'OrderItems': [],
        'MenuItems': [],
        'Categories': [],
        'Expenses': []
    }
    
    # Handle different JSON structures
    if isinstance(data, dict):
        for key in result.keys():
            if key in data:
                result[key] = data[key]
    elif isinstance(data, list):
        for table in data:
            if isinstance(table, dict) and 'name' in table:
                name = table['name']
                if name in result:
                    result[name] = table.get('data', [])
    
    return result


def prepare_sales_df(data: Dict) -> pd.DataFrame:
    """Prepare sales DataFrame from receipts."""
    receipts = data.get('DailyReceipts', [])
    if not receipts:
        return pd.DataFrame()
    
    df = pd.DataFrame(receipts)
    
    # Normalize date column
    date_col = 'receiptDate' if 'receiptDate' in df.columns else 'date'
    if date_col not in df.columns:
        return pd.DataFrame()
    
    df['day'] = pd.to_datetime(df[date_col])
    
    # Normalize sales column
    sales_col = 'totalSales' if 'totalSales' in df.columns else 'total_sales'
    if sales_col in df.columns:
        df['total_sales'] = pd.to_numeric(df[sales_col], errors='coerce').fillna(0)
    else:
        return pd.DataFrame()
    
    # Add expense column if available
    expense_col = 'totalExpenses' if 'totalExpenses' in df.columns else 'total_expenses'
    if expense_col in df.columns:
        df['total_expenses'] = pd.to_numeric(df[expense_col], errors='coerce').fillna(0)
    
    df = df.set_index('day').sort_index()
    return df


def load_lightgbm_model() -> Tuple[Optional[object], Optional[Dict]]:
    """Load LightGBM model and metadata."""
    try:
        if os.path.exists(LIGHTGBM_PATH) and os.path.exists(LIGHTGBM_META_PATH):
            model = joblib.load(LIGHTGBM_PATH)
            with open(LIGHTGBM_META_PATH, 'r') as f:
                metadata = json.load(f)
            return model, metadata
    except Exception as e:
        pass
    return None, None


def load_arima_model():
    """Load ARIMA model."""
    try:
        if os.path.exists(ARIMA_PATH):
            arima_obj = joblib.load(ARIMA_PATH)
            if isinstance(arima_obj, dict) and 'model' in arima_obj:
                return arima_obj['model']
            return arima_obj
    except:
        pass
    return None


def calculate_confidence_interval(predictions: np.ndarray, historical_std: float = None, confidence: float = 0.95) -> Tuple[np.ndarray, np.ndarray]:
    """Calculate confidence intervals for predictions."""
    if historical_std is None:
        std = np.std(predictions) if len(predictions) > 1 else predictions.mean() * 0.15
    else:
        std = historical_std
    
    z_score = 1.96 if confidence == 0.95 else 1.645
    margin = z_score * std
    lower = predictions - margin
    upper = predictions + margin
    return np.maximum(lower, 0), upper


def detect_anomalies(df: pd.DataFrame, column: str = 'total_sales', threshold: float = 2.0) -> pd.DataFrame:
    """Detect anomalies using Z-score method."""
    if df.empty or column not in df.columns:
        return pd.DataFrame()
    
    mean = df[column].mean()
    std = df[column].std()
    
    if std == 0:
        return pd.DataFrame()
    
    df_copy = df.copy()
    df_copy['z_score'] = (df_copy[column] - mean) / std
    df_copy['is_anomaly'] = abs(df_copy['z_score']) > threshold
    
    return df_copy[df_copy['is_anomaly']].copy()


def analyze_seasonal_patterns(df: pd.DataFrame) -> Dict:
    """Analyze weekly and daily patterns."""
    if df.empty:
        return {}
    
    df_copy = df.copy()
    df_copy['day_of_week'] = df_copy.index.dayofweek
    df_copy['day_name'] = df_copy.index.day_name()
    
    # Arabic day names
    day_names_ar = {
        'Monday': 'الإثنين',
        'Tuesday': 'الثلاثاء', 
        'Wednesday': 'الأربعاء',
        'Thursday': 'الخميس',
        'Friday': 'الجمعة',
        'Saturday': 'السبت',
        'Sunday': 'الأحد'
    }
    
    # Weekly pattern
    weekly_avg = df_copy.groupby('day_name')['total_sales'].mean().to_dict()
    weekly_avg_ar = {day_names_ar.get(k, k): v for k, v in weekly_avg.items()}
    
    # Best and worst days
    best_day = max(weekly_avg.items(), key=lambda x: x[1])
    worst_day = min(weekly_avg.items(), key=lambda x: x[1])
    
    # Weekend vs Weekday (Friday/Saturday in Arab world)
    df_copy['is_weekend'] = df_copy['day_of_week'].isin([4, 5])
    weekend_avg = df_copy[df_copy['is_weekend']]['total_sales'].mean() if df_copy['is_weekend'].any() else 0
    weekday_avg = df_copy[~df_copy['is_weekend']]['total_sales'].mean() if (~df_copy['is_weekend']).any() else 0
    
    weekend_boost = 0
    if weekday_avg > 0:
        weekend_boost = ((weekend_avg - weekday_avg) / weekday_avg) * 100
    
    return {
        'weekly_pattern': weekly_avg_ar,
        'best_day': (day_names_ar.get(best_day[0], best_day[0]), best_day[1]),
        'worst_day': (day_names_ar.get(worst_day[0], worst_day[0]), worst_day[1]),
        'weekend_avg': weekend_avg,
        'weekday_avg': weekday_avg,
        'weekend_boost': weekend_boost
    }


def analyze_products(data: Dict) -> Dict:
    """Analyze product performance."""
    order_items = data.get('OrderItems', [])
    menu_items = data.get('MenuItems', [])
    
    if not order_items or not menu_items:
        return {}
    
    # Create menu lookup
    menu_lookup = {}
    for item in menu_items:
        item_id = item.get('idMenuItem') or item.get('id')
        item_name = item.get('itemName') or item.get('name')
        if item_id and item_name:
            menu_lookup[int(item_id)] = item_name
    
    # Count product sales
    product_counts = {}
    product_revenue = {}
    
    for item in order_items:
        menu_id = int(item.get('menuItemId', 0))
        qty = int(item.get('quantity', 1))
        price = float(item.get('price', 0))
        
        name = menu_lookup.get(menu_id, f"منتج {menu_id}")
        product_counts[name] = product_counts.get(name, 0) + qty
        product_revenue[name] = product_revenue.get(name, 0) + (price * qty)
    
    # Top products
    top_by_count = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_by_revenue = sorted(product_revenue.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        'top_by_quantity': top_by_count,
        'top_by_revenue': top_by_revenue,
        'total_products_sold': sum(product_counts.values()),
        'unique_products': len(product_counts)
    }


def generate_recommendations(data: Dict, sales_df: pd.DataFrame, patterns: Dict, products: Dict) -> List[str]:
    """Generate smart business recommendations."""
    recommendations = []
    
    # 1. Based on seasonal patterns
    if patterns:
        weekend_boost = patterns.get('weekend_boost', 0)
        if weekend_boost > 20:
            recommendations.append(f"📈 مبيعات نهاية الأسبوع أعلى بـ {weekend_boost:.0f}% - زيادة المخزون والموظفين مطلوبة")
        elif weekend_boost < -10:
            recommendations.append("💡 نهاية الأسبوع أضعف - جرب عروض خاصة لجذب الزبائن")
        
        if patterns.get('best_day'):
            recommendations.append(f"⭐ يوم {patterns['best_day'][0]} هو الأفضل للمبيعات ({patterns['best_day'][1]:,.0f} IQD)")
    
    # 2. Based on product analysis
    if products and products.get('top_by_quantity'):
        top_product = products['top_by_quantity'][0][0]
        recommendations.append(f"🏆 المنتج الأكثر طلباً: {top_product} - تأكد من توفره دائماً")
    
    # 3. Based on sales trends
    if not sales_df.empty and len(sales_df) >= 14:
        recent_sales = sales_df['total_sales'].tail(7).mean()
        older_sales = sales_df['total_sales'].head(7).mean()
        
        if older_sales > 0:
            trend = ((recent_sales - older_sales) / older_sales) * 100
            if trend > 10:
                recommendations.append(f"📊 المبيعات في تصاعد بنسبة {trend:.0f}%! حافظ على الزخم")
            elif trend < -10:
                recommendations.append(f"⚠️ المبيعات تراجعت بنسبة {abs(trend):.0f}% - راجع الجودة والخدمة")
    
    # 4. Expense optimization
    if not sales_df.empty and 'total_expenses' in sales_df.columns:
        avg_margin = (sales_df['total_sales'] - sales_df['total_expenses']).mean()
        avg_sales = sales_df['total_sales'].mean()
        margin_pct = (avg_margin / avg_sales * 100) if avg_sales > 0 else 0
        
        if margin_pct < 30:
            recommendations.append(f"💰 هامش الربح منخفض ({margin_pct:.0f}%) - راجع تكاليف التشغيل")
        elif margin_pct > 50:
            recommendations.append(f"✅ هامش ربح ممتاز ({margin_pct:.0f}%)! فكر في إعادة الاستثمار")
    
    if not recommendations:
        recommendations.append("📊 استمر في جمع البيانات للحصول على توصيات أكثر دقة")
    
    return recommendations


def forecast_with_lightgbm(model, metadata: Dict, df: pd.DataFrame, days: int = 7) -> pd.DataFrame:
    """Generate forecasts using LightGBM model."""
    if df.empty:
        return pd.DataFrame()
    
    features = metadata.get('features', [])
    predictions = []
    dates = []
    
    last_date = df.index.max()
    historical_mean = df['total_sales'].mean()
    
    for i in range(days):
        next_date = last_date + timedelta(days=i+1)
        dates.append(next_date)
        
        # Build feature vector
        feature_values = {
            'day_of_week': next_date.weekday(),
            'is_weekend': 1 if next_date.weekday() in [4, 5] else 0,
            'day_of_month': next_date.day,
            'month': next_date.month,
        }
        
        # Add lag features from historical data
        if len(df) > 0:
            feature_values['sales_lag_1'] = df['total_sales'].iloc[-1] if i == 0 else predictions[-1]
            feature_values['orders_lag_1'] = 0
            feature_values['items_lag_1'] = 0
            feature_values['sales_lag_2'] = df['total_sales'].iloc[-2] if len(df) > 1 and i < 2 else (predictions[-2] if len(predictions) > 1 else historical_mean)
            feature_values['orders_lag_2'] = 0
            feature_values['items_lag_2'] = 0
            feature_values['sales_lag_3'] = df['total_sales'].iloc[-3] if len(df) > 2 and i < 3 else historical_mean
            feature_values['orders_lag_3'] = 0
            feature_values['items_lag_3'] = 0
            feature_values['sales_rolling_3'] = df['total_sales'].tail(3).mean()
            feature_values['orders_rolling_3'] = 0
            feature_values['items_rolling_3'] = 0
            feature_values['sales_rolling_7'] = df['total_sales'].tail(7).mean()
            feature_values['orders_rolling_7'] = 0
            feature_values['items_rolling_7'] = 0
            feature_values['sales_trend'] = df['total_sales'].diff().mean() if len(df) > 1 else 0
        
        # Build feature array in correct order
        X = np.array([[feature_values.get(f, 0) for f in features]])
        
        try:
            pred = model.predict(X)[0]
            predictions.append(max(0, pred))
        except Exception as e:
            predictions.append(historical_mean)
    
    return pd.DataFrame({
        'date': dates,
        'predicted_sales': predictions
    })


def forecast_with_arima(model, steps: int = 7) -> List[float]:
    """Generate forecasts using ARIMA model."""
    try:
        forecast = model.forecast(steps=steps)
        if isinstance(forecast, pd.Series):
            return forecast.values.tolist()
        return list(forecast)
    except:
        return []


def generate_full_report(data: Dict) -> str:
    """Generate comprehensive AI business intelligence report."""
    report = "# 🧠 تقرير ذكاء الأعمال المتقدم\n\n"
    report += f"*تم إنشاؤه في: {datetime.now().strftime('%Y-%m-%d %H:%M')}*\n\n"
    
    sales_df = prepare_sales_df(data)
    
    if sales_df.empty:
        return report + "⚠️ لا تتوفر بيانات كافية للتحليل. يرجى التأكد من وجود سجلات المبيعات."
    
    historical_std = sales_df['total_sales'].std()
    
    # 1. Model Status & Predictions
    report += "## 📈 توقعات المبيعات\n\n"
    
    lgb_model, lgb_meta = load_lightgbm_model()
    arima_model = load_arima_model()
    
    # LightGBM Forecast
    if lgb_model and lgb_meta:
        forecast_df = forecast_with_lightgbm(lgb_model, lgb_meta, sales_df, days=7)
        
        if not forecast_df.empty:
            predictions = forecast_df['predicted_sales'].values
            lower, upper = calculate_confidence_interval(predictions, historical_std)
            
            report += "### 🔮 توقعات LightGBM (الأسبوع القادم)\n\n"
            report += "| التاريخ | المتوقع | النطاق (95%) |\n|---|---|---|\n"
            
            for i, row in forecast_df.iterrows():
                date_str = row['date'].strftime('%Y-%m-%d')
                pred = row['predicted_sales']
                report += f"| {date_str} | **{pred:,.0f}** | {lower[i]:,.0f} - {upper[i]:,.0f} |\n"
            
            mae = lgb_meta.get('metrics', {}).get('mae', 0)
            if mae:
                report += f"\n*دقة النموذج (MAE): ±{mae:,.0f} IQD*\n"
    
    # ARIMA Forecast
    if arima_model:
        arima_forecast = forecast_with_arima(arima_model, steps=3)
        if arima_forecast:
            report += "\n### 📊 توقعات ARIMA (3 أيام)\n\n"
            report += "| اليوم | المتوقع |\n|---|---|\n"
            for i, val in enumerate(arima_forecast):
                report += f"| +{i+1} | {val:,.0f} IQD |\n"
    
    report += "\n"
    
    # 2. Anomaly Detection
    report += "## 🚨 كشف الشذوذ\n\n"
    
    anomalies = detect_anomalies(sales_df, threshold=2.0)
    
    if not anomalies.empty:
        report += f"تم اكتشاف **{len(anomalies)}** قيم غير طبيعية:\n\n"
        report += "| التاريخ | المبيعات | الحالة |\n|---|---|---|\n"
        
        for date, row in anomalies.iterrows():
            date_str = date.strftime('%Y-%m-%d')
            z = row['z_score']
            status = "🔴 مرتفع جداً" if z > 0 else "🟡 منخفض جداً"
            report += f"| {date_str} | {row['total_sales']:,.0f} | {status} ({z:.1f}σ) |\n"
    else:
        report += "✅ لا توجد قيم شاذة - البيانات ضمن النطاق الطبيعي\n"
    
    report += "\n"
    
    # 3. Seasonal Patterns
    report += "## 📅 أنماط المبيعات الأسبوعية\n\n"
    
    patterns = analyze_seasonal_patterns(sales_df)
    
    if patterns and patterns.get('weekly_pattern'):
        report += "| اليوم | متوسط المبيعات |\n|---|---|\n"
        
        sorted_days = sorted(patterns['weekly_pattern'].items(), key=lambda x: x[1], reverse=True)
        for day, avg in sorted_days:
            report += f"| {day} | {avg:,.0f} IQD |\n"
        
        report += f"\n**أفضل يوم:** {patterns['best_day'][0]} ({patterns['best_day'][1]:,.0f} IQD)\n"
        report += f"**أضعف يوم:** {patterns['worst_day'][0]} ({patterns['worst_day'][1]:,.0f} IQD)\n"
        
        boost = patterns.get('weekend_boost', 0)
        if boost > 0:
            report += f"\n📈 عطلة نهاية الأسبوع أعلى بـ **{boost:.1f}%**\n"
        elif boost < 0:
            report += f"\n📉 عطلة نهاية الأسبوع أقل بـ **{abs(boost):.1f}%**\n"
    
    report += "\n"
    
    # 4. Product Analysis
    report += "## 🏆 تحليل المنتجات\n\n"
    
    products = analyze_products(data)
    
    if products and products.get('top_by_quantity'):
        report += "### الأكثر مبيعاً\n\n"
        report += "| المنتج | الكمية | الإيرادات |\n|---|---|---|\n"
        
        revenue_dict = dict(products.get('top_by_revenue', []))
        for name, count in products['top_by_quantity']:
            revenue = revenue_dict.get(name, 0)
            report += f"| {name} | {count} | {revenue:,.0f} IQD |\n"
        
        report += f"\n*إجمالي المنتجات المباعة: {products['total_products_sold']} وحدة*\n"
    else:
        report += "*لا تتوفر بيانات منتجات كافية*\n"
    
    report += "\n"
    
    # 5. Smart Recommendations
    report += "## 💡 توصيات ذكية\n\n"
    
    recommendations = generate_recommendations(data, sales_df, patterns, products)
    
    for rec in recommendations:
        report += f"- {rec}\n"
    
    # 6. Summary Stats
    report += "\n## 📊 ملخص إحصائي\n\n"
    report += f"- **إجمالي المبيعات:** {sales_df['total_sales'].sum():,.0f} IQD\n"
    report += f"- **متوسط يومي:** {sales_df['total_sales'].mean():,.0f} IQD\n"
    report += f"- **أعلى يوم:** {sales_df['total_sales'].max():,.0f} IQD\n"
    report += f"- **أدنى يوم:** {sales_df['total_sales'].min():,.0f} IQD\n"
    report += f"- **عدد الأيام:** {len(sales_df)}\n"
    
    report += "\n---\n*تم إنشاء هذا التقرير بواسطة نظام ذكاء الأعمال المحلي*"
    
    return report


def generate_forecast_only(data: Dict) -> str:
    """Generate forecast-focused report."""
    report = "# 🔮 تقرير توقعات المبيعات\n\n"
    
    sales_df = prepare_sales_df(data)
    
    if sales_df.empty:
        return report + "⚠️ لا تتوفر بيانات للتنبؤ"
    
    lgb_model, lgb_meta = load_lightgbm_model()
    historical_std = sales_df['total_sales'].std()
    
    if lgb_model and lgb_meta:
        forecast_df = forecast_with_lightgbm(lgb_model, lgb_meta, sales_df, days=14)
        
        if not forecast_df.empty:
            predictions = forecast_df['predicted_sales'].values
            lower, upper = calculate_confidence_interval(predictions, historical_std)
            
            report += "## الأسبوعين القادمين\n\n"
            report += "| التاريخ | اليوم | المتوقع | الحد الأدنى | الحد الأعلى |\n|---|---|---|---|---|\n"
            
            day_names = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد']
            
            for i, row in forecast_df.iterrows():
                date_str = row['date'].strftime('%Y-%m-%d')
                day_name = day_names[row['date'].weekday()]
                pred = row['predicted_sales']
                report += f"| {date_str} | {day_name} | **{pred:,.0f}** | {lower[i]:,.0f} | {upper[i]:,.0f} |\n"
            
            total_forecast = predictions.sum()
            report += f"\n**إجمالي المتوقع:** {total_forecast:,.0f} IQD\n"
            report += f"**متوسط يومي:** {predictions.mean():,.0f} IQD\n"
    else:
        avg = sales_df['total_sales'].mean()
        std = sales_df['total_sales'].std()
        report += "⚠️ نموذج LightGBM غير متوفر. استخدام التوقع الإحصائي:\n\n"
        report += f"- **المتوسط التاريخي:** {avg:,.0f} IQD\n"
        report += f"- **النطاق المتوقع:** {avg-std:,.0f} - {avg+std:,.0f} IQD\n"
    
    return report


def generate_anomaly_report(data: Dict) -> str:
    """Generate anomaly detection report."""
    report = "# 🚨 تقرير كشف الشذوذ\n\n"
    
    sales_df = prepare_sales_df(data)
    
    if sales_df.empty:
        return report + "⚠️ لا تتوفر بيانات للتحليل"
    
    mean = sales_df['total_sales'].mean()
    std = sales_df['total_sales'].std()
    
    report += "## الإحصائيات الأساسية\n\n"
    report += f"- **المتوسط:** {mean:,.0f} IQD\n"
    report += f"- **الانحراف المعياري:** {std:,.0f} IQD\n"
    report += f"- **الحد الأعلى الطبيعي (2σ):** {mean + 2*std:,.0f} IQD\n"
    report += f"- **الحد الأدنى الطبيعي (2σ):** {max(0, mean - 2*std):,.0f} IQD\n\n"
    
    anomalies = detect_anomalies(sales_df, threshold=2.0)
    
    if not anomalies.empty:
        report += "## القيم الشاذة المكتشفة\n\n"
        report += "| التاريخ | المبيعات | الانحراف | النوع |\n|---|---|---|---|\n"
        
        for date, row in anomalies.iterrows():
            date_str = date.strftime('%Y-%m-%d')
            z = row['z_score']
            anomaly_type = "📈 ارتفاع" if z > 0 else "📉 انخفاض"
            report += f"| {date_str} | {row['total_sales']:,.0f} | {z:.2f}σ | {anomaly_type} |\n"
    else:
        report += "## ✅ النتيجة\n\nلم يتم اكتشاف قيم شاذة. البيانات طبيعية.\n"
    
    return report


def generate_recommendations_report(data: Dict) -> str:
    """Generate recommendations-focused report."""
    report = "# 💡 توصيات ذكية لتحسين الأداء\n\n"
    
    sales_df = prepare_sales_df(data)
    patterns = analyze_seasonal_patterns(sales_df)
    products = analyze_products(data)
    
    recommendations = generate_recommendations(data, sales_df, patterns, products)
    
    report += "## التوصيات الرئيسية\n\n"
    for i, rec in enumerate(recommendations, 1):
        report += f"### {i}. {rec}\n\n"
    
    if patterns and patterns.get('best_day'):
        report += "## 📅 تحسين جدول العمل\n\n"
        report += f"- زيادة الموظفين يوم **{patterns['best_day'][0]}**\n"
        report += f"- تقليل التكاليف يوم **{patterns['worst_day'][0]}**\n"
    
    return report


def main():
    """Main entry point."""
    try:
        prompt = sys.argv[1] if len(sys.argv) > 1 else "full_report"
        temp_file = sys.argv[2] if len(sys.argv) > 2 else None
        
        data = load_data(temp_file)
        
        if prompt == "full_report":
            print(generate_full_report(data))
        elif prompt == "forecast_only":
            print(generate_forecast_only(data))
        elif prompt == "detect_anomalies":
            print(generate_anomaly_report(data))
        elif prompt == "recommendations":
            print(generate_recommendations_report(data))
        else:
            print(generate_full_report(data))
            
    except Exception as e:
        import traceback
        print(f"# خطأ\n\nحدث خطأ:\n```\n{traceback.format_exc()}\n```")


if __name__ == "__main__":
    main()
