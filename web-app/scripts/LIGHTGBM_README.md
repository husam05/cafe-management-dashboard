# LightGBM Sales Forecasting

Fast and accurate sales prediction using LightGBM.

## Setup

```bash
pip install lightgbm scikit-learn pandas numpy joblib
```

## Usage

### 1. Train Model

```bash
# Export latest data first
npx tsx scripts/export_data.ts

# Train LightGBM model
python scripts/train_lightgbm.py
```

This will:
- Load data from `daily_cafe_dataset.csv`
- Engineer features (lags, rolling averages, trends)
- Train with time series cross-validation
- Save model to `Dataset-creat/models/lightgbm_sales_model.pkl`

### 2. Daily Predictions

```bash
# Run daily prediction pipeline
python scripts/daily_predictions.py
```

This generates:
- 7-day sales forecast
- Recommendations (high/low demand alerts)
- Saves to `predictions_daily.json`

### 3. Schedule Daily Job

**Linux/Mac (cron):**
```bash
# Edit crontab
crontab -e

# Add daily job at 6 AM
0 6 * * * cd /path/to/web-app && npx tsx scripts/export_data.ts && python scripts/daily_predictions.py
```

**Windows (Task Scheduler):**
Create a batch file `daily_forecast.bat`:
```batch
cd C:\path\to\web-app
call npx tsx scripts\export_data.ts
call python scripts\daily_predictions.py
```

Schedule it in Task Scheduler to run daily.

## Model Performance

- **Algorithm**: LightGBM (Gradient Boosting)
- **Features**: 20+ (lags, rolling averages, day of week, trends)
- **Validation**: Time Series Cross-Validation (5 folds)
- **Metrics**: MAE (Mean Absolute Error), MAPE (Mean Absolute Percentage Error)

## Output Format

`predictions_daily.json`:
```json
{
  "generated_at": "2025-12-18T00:00:00",
  "predictions": [
    {
      "date": "2025-12-19",
      "day_name": "Thursday",
      "predicted_sales": 1250000,
      "confidence": "high"
    }
  ],
  "recommendations": [
    {
      "type": "high_demand",
      "date": "2025-12-20",
      "message": "توقع مبيعات عالية. تأكد من توفر المخزون.",
      "priority": "high"
    }
  ],
  "summary": {
    "total_predicted_sales": 8500000,
    "avg_daily_sales": 1214285,
    "high_demand_days": 2
  }
}
```

## Integration with Dashboard

The predictions can be displayed in the AI Insights page by:
1. Reading `predictions_daily.json`
2. Showing forecast chart
3. Displaying recommendations as alerts

## Why LightGBM?

- ⚡ **Fast**: 10x faster than traditional methods
- 🎯 **Accurate**: Handles complex patterns
- 📊 **Production-Ready**: Used by Uber, Microsoft, etc.
- 💾 **Lightweight**: Small model size (~1MB)
