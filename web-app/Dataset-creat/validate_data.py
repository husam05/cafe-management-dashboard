
import pandas as pd
import numpy as np
import os

# Use absolute path based on script location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, 'daily_cafe_dataset.csv')

def check_ml_readiness():
    print("🕵️‍♂️ Auditing Dataset for ML Readiness...")
    
    if not os.path.exists(DATASET_PATH):
        print("❌ Dataset not found!")
        return

    df = pd.read_csv(DATASET_PATH)
    df['day'] = pd.to_datetime(df['day'])
    df = df.sort_values('day')
    
    print(f"📊 Shape: {df.shape}")
    print(f"🗓 Data Range: {df['day'].min()} to {df['day'].max()}")
    print("-" * 30)
    
    # 1. Missing Values
    missing = df.isnull().sum().sum()
    if missing == 0:
        print("✅ No missing values (NULLs).")
    else:
        print(f"⚠️ Found {missing} missing values:")
        print(df.isnull().sum()[df.isnull().sum() > 0])

    # 2. Data Types
    non_numeric = df.select_dtypes(exclude=[np.number, 'datetime64[ns]']).columns
    if len(non_numeric) == 0:
        print("✅ All columns are numeric or datetime.")
    else:
        print(f"⚠️ Non-numeric columns found (might need One-Hot Encoding): {list(non_numeric)}")

    # 3. Target Variable Check (Total Sales)
    zeros = (df['total_sales'] == 0).sum()
    total_days = len(df)
    percent_zeros = (zeros / total_days) * 100
    
    print(f"💰 Zero Sale Days: {zeros}/{total_days} ({percent_zeros:.1f}%)")
    
    if percent_zeros > 50:
        print("   ⚠️ Warning: More than 50% of days have 0 sales. This might be a sparse dataset or includes future dates/closed days.")
    
    # 4. Feature Checking (Variance)
    # Features with 0 variance (constant values) are useless
    low_variance = []
    for col in df.select_dtypes(include=[np.number]).columns:
        if df[col].std() == 0:
            low_variance.append(col)
            
    if low_variance:
        print(f"⚠️ Constant features (0 variance): {low_variance}")
        print("   -> Classification: These provide no info for ML.")
    else:
        print("✅ All distinct profit/inventory features have variance.")

    # 5. Sequence Continuity
    expected_range = pd.date_range(start=df['day'].min(), end=df['day'].max())
    if len(expected_range) == len(df):
        print("✅ Time series is continuous (no gaps in dates).")
    else:
        print(f"❌ Time series has gaps! Expected {len(expected_range)} days, got {len(df)}.")

    print("-" * 30)
    print("🤖 Recommendation:")
    
    if percent_zeros > 70:
         print("🔴 NOT READY. Too many zero days. Filter out closed days or check extraction logic.")
    elif len(df) < 30:
         print("🟡 WARNING. Very small dataset (<30 samples). Deep Learning (LSTM) will fail. Use statistical methods (ARIMA) or accumulate more data.")
    else:
         print("🟢 READY. Dataset looks healthy for training Regression/Time-Series models.")

if __name__ == "__main__":
    check_ml_readiness()
