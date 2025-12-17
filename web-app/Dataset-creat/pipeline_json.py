import sqlite3
import pandas as pd
import json
import os
from sqlalchemy import create_engine

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(os.path.dirname(SCRIPT_DIR), "cafe_management.json")
DB_PATH = os.path.join(SCRIPT_DIR, "cafe.db")
OUTPUT_CSV = os.path.join(SCRIPT_DIR, "daily_cafe_dataset.csv")
OUTPUT_PARQUET = os.path.join(SCRIPT_DIR, "daily_cafe_dataset.parquet")


def load_db_from_json():
    """Load PHPMyAdmin JSON export into SQLite database."""
    print("🚀 Loading JSON export into SQLite...")
    
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Remove old DB
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    
    conn = sqlite3.connect(DB_PATH)
    
    tables_loaded = 0
    for item in data:
        if item.get('type') == 'table':
            table_name = item['name']
            table_data = item.get('data', [])
            
            if table_data:
                df = pd.DataFrame(table_data)
                df.to_sql(table_name, conn, if_exists='replace', index=False)
                tables_loaded += 1
                print(f"   ✓ Loaded {table_name}: {len(df)} rows")
            else:
                print(f"   ⚠ Skipped {table_name}: empty")
    
    conn.close()
    print(f"✅ Database created with {tables_loaded} tables")


def extract_dataset():
    """Extract and aggregate dataset from SQLite database."""
    print("🔍 Extracting aggregated dataset...")
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    # 1. DailyReceipts (for reference, but Orders is primary for sales)
    df_receipts = pd.read_sql_query("""
        SELECT 
            substr(receiptDate, 1, 10) as day,
            CAST(totalSales AS REAL) as totalSales, 
            CAST(totalExpenses AS REAL) as totalExpenses, 
            CAST(closingCash AS REAL) as closingCash
        FROM DailyReceipts
    """, engine)
    
    # 2. Orders (PRIMARY source for sales - exclude cancelled)
    df_orders = pd.read_sql_query("""
        SELECT 
            substr(orderDate, 1, 10) as day,
            idOrder, 
            CAST(totalAmount AS REAL) as totalAmount, 
            CAST(discount AS REAL) as discount,
            CAST(substr(orderDate, 12, 2) AS INT) as hour,
            status
        FROM Orders 
        WHERE status != 'cancelled'
    """, engine)
    
    # 3. Order Items
    df_order_items = pd.read_sql_query("""
        SELECT 
            substr(o.orderDate, 1, 10) as day,
            CAST(oi.quantity AS REAL) as quantity
        FROM OrderItems oi
        JOIN Orders o ON oi.orderId = o.idOrder
        WHERE o.status != 'cancelled'
    """, engine)
    
    # 4. Expenses (Detailed)
    df_expenses_detailed = pd.read_sql_query("""
        SELECT 
            substr(expenseDate, 1, 10) as day, 
            CAST(amount AS REAL) as amount,
            category
        FROM Expenses
    """, engine)
    
    # 5. Inventory Transactions
    df_inventory = pd.read_sql_query("""
        SELECT 
            substr(transactionDate, 1, 10) as day, 
            transactionType, 
            CAST(quantity AS REAL) as quantity 
        FROM InventoryTransactions
    """, engine)
    
    # --- Processing ---
    
    # 1. Financials from Receipts (aggregate by day, handles multiple shifts)
    if not df_receipts.empty:
        daily_financials = df_receipts.groupby('day').agg({
            'totalSales': 'sum',
            'totalExpenses': 'sum',
            'closingCash': 'sum'
        }).rename(columns={
            'totalSales': 'total_sales', 
            'totalExpenses': 'receipt_expenses', 
            'closingCash': 'cash_sales'
        })
    else:
        daily_financials = pd.DataFrame()
    
    # 2. Detailed Expenses
    if not df_expenses_detailed.empty:
        daily_expenses = df_expenses_detailed.groupby('day')['amount'].sum().rename('total_expenses')
        
        # Category breakdown for insights
        expense_categories = df_expenses_detailed.groupby(['day', 'category'])['amount'].sum().unstack(fill_value=0)
        expense_categories.columns = [f'expense_{c}' for c in expense_categories.columns]
    else:
        daily_expenses = pd.Series(dtype=float, name='total_expenses')
        expense_categories = pd.DataFrame()
    
    # 3. Order Metadata - Use Orders totalAmount as PRIMARY sales source
    if not df_orders.empty:
        daily_orders = df_orders.groupby('day').agg({
            'idOrder': 'count',
            'totalAmount': 'sum',  # This is the actual sales from orders
            'discount': 'sum'
        }).rename(columns={
            'idOrder': 'orders_count', 
            'totalAmount': 'order_sales',  # Sales from orders table
            'discount': 'discounts'
        })
        
        # Shift breakdown
        df_orders['shift'] = df_orders['hour'].apply(lambda h: 'morning' if h < 15 else 'evening')
        shift_sales = df_orders.groupby(['day', 'shift'])['totalAmount'].sum().unstack(fill_value=0)
        shift_sales.columns = [f'{c}_shift_sales' for c in shift_sales.columns]
    else:
        daily_orders = pd.DataFrame()
        shift_sales = pd.DataFrame()
    
    # 4. Items Sold
    if not df_order_items.empty:
        daily_items = df_order_items.groupby('day')['quantity'].sum().rename('items_sold')
    else:
        daily_items = pd.Series(dtype=float, name='items_sold')
    
    # 5. Inventory Metrics
    if not df_inventory.empty:
        waste = df_inventory[df_inventory['transactionType'] == 'waste'].groupby('day')['quantity'].sum().abs().rename('inventory_waste_qty')
        usage = df_inventory[df_inventory['transactionType'] == 'usage'].groupby('day')['quantity'].sum().abs().rename('inventory_usage_qty')
    else:
        waste = pd.Series(dtype=float, name='inventory_waste_qty')
        usage = pd.Series(dtype=float, name='inventory_usage_qty')
    
    # --- Build Master DataFrame ---
    
    # Get date range from ORDERS only (ignore expense outliers like the 2025-03-12 typo)
    if not df_orders.empty:
        order_dates = pd.to_datetime(df_orders['day'])
        start_date = order_dates.min()
        end_date = order_dates.max()
    else:
        print("❌ No orders found!")
        return pd.DataFrame()
    
    full_daterange = pd.date_range(start=start_date, end=end_date)
    df_master = pd.DataFrame(index=full_daterange.strftime('%Y-%m-%d'))
    df_master.index.name = 'day'
    
    # Join all components
    df_final = df_master
    
    if not daily_financials.empty:
        df_final = df_final.join(daily_financials)
    
    if not daily_orders.empty:
        df_final = df_final.join(daily_orders)
    
    if not shift_sales.empty:
        df_final = df_final.join(shift_sales)
    
    if not daily_items.empty:
        df_final = df_final.join(daily_items)
    
    if not daily_expenses.empty:
        df_final = df_final.join(daily_expenses)
    
    if not waste.empty:
        df_final = df_final.join(waste)
    
    if not usage.empty:
        df_final = df_final.join(usage)
    
    # Fill NaN with 0
    df_final.fillna(0, inplace=True)
    
    # Ensure required columns exist
    for col in ['total_sales', 'receipt_expenses', 'cash_sales', 'orders_count', 
                'discounts', 'morning_shift_sales', 'evening_shift_sales', 
                'items_sold', 'total_expenses', 'inventory_waste_qty', 'inventory_usage_qty',
                'order_sales']:
        if col not in df_final.columns:
            df_final[col] = 0
    
    # Use order_sales as primary total_sales (more reliable than DailyReceipts)
    # If DailyReceipts has data, keep it as reference, but order_sales is the source of truth
    df_final['total_sales'] = df_final['order_sales']
    
    # Computed metrics
    df_final['average_order_value'] = df_final.apply(
        lambda x: (x['total_sales'] / x['orders_count']) if x['orders_count'] > 0 else 0, axis=1
    )
    
    df_final['gross_profit'] = df_final['total_sales'] - df_final['total_expenses']
    
    df_final['profit_margin'] = df_final.apply(
        lambda x: (x['gross_profit'] / x['total_sales'] * 100) if x['total_sales'] > 0 else 0, axis=1
    )
    
    df_final['cash_ratio'] = df_final.apply(
        lambda x: (x['cash_sales'] / x['total_sales']) if x['total_sales'] > 0 else 0, axis=1
    )
    
    return df_final


def engineer_features(df):
    """Add ML-ready engineered features."""
    print("🛠 Engineering Features...")
    
    # Rolling Averages
    df['rolling_7d_sales_avg'] = df['total_sales'].rolling(window=7, min_periods=1).mean()
    df['rolling_30d_sales_avg'] = df['total_sales'].rolling(window=30, min_periods=1).mean()
    
    # Inventory Burn Rate
    df['inventory_burn_rate'] = df['inventory_usage_qty'].rolling(window=7, min_periods=1).mean()
    
    # Growth Rates
    df['sales_growth_rate'] = df['total_sales'].pct_change().fillna(0)
    df['expense_growth_rate'] = df['total_expenses'].pct_change().fillna(0)
    
    # Lag Features
    df['lag_1_sales'] = df['total_sales'].shift(1).fillna(0)
    df['lag_7_sales'] = df['total_sales'].shift(7).fillna(0)
    
    # Day of Week (categorical for seasonality)
    df['day_of_week'] = pd.to_datetime(df.index).dayofweek
    df['is_weekend'] = df['day_of_week'].isin([4, 5]).astype(int)  # Friday=4, Saturday=5
    
    return df


def analyze_data_quality(df):
    """Print data quality analysis."""
    print("\n📊 Data Quality Analysis:")
    print(f"   Date Range: {df.index.min()} to {df.index.max()}")
    print(f"   Total Days: {len(df)}")
    
    # Sales analysis
    sales_days = (df['total_sales'] > 0).sum()
    zero_sales_days = (df['total_sales'] == 0).sum()
    print(f"\n   💰 Sales Analysis:")
    print(f"      Days with sales: {sales_days}")
    print(f"      Days without sales: {zero_sales_days} ({zero_sales_days/len(df)*100:.1f}%)")
    print(f"      Total Revenue: {df['total_sales'].sum():,.0f}")
    print(f"      Average Daily Sales: {df['total_sales'].mean():,.0f}")
    print(f"      Max Daily Sales: {df['total_sales'].max():,.0f}")
    
    # Expenses analysis
    print(f"\n   💸 Expenses Analysis:")
    print(f"      Total Expenses: {df['total_expenses'].sum():,.0f}")
    print(f"      Average Daily Expenses: {df['total_expenses'].mean():,.0f}")
    
    # Orders analysis
    print(f"\n   🛒 Orders Analysis:")
    print(f"      Total Orders: {df['orders_count'].sum():,.0f}")
    print(f"      Total Items Sold: {df['items_sold'].sum():,.0f}")
    print(f"      Average Items per Day: {df['items_sold'].mean():,.1f}")
    
    # ML Readiness
    print(f"\n   🤖 ML Readiness:")
    if len(df) < 30:
        print("      ⚠️ WARNING: Small dataset (<30 days). Consider ARIMA over deep learning.")
    elif len(df) < 90:
        print("      🟡 MODERATE: Dataset is small for LSTM. Classical ML may work better.")
    else:
        print("      🟢 GOOD: Dataset size is adequate for ML training.")


def main():
    if not os.path.exists(JSON_PATH):
        print(f"❌ Error: JSON file not found at {JSON_PATH}")
        return

    # 1. Load DB from JSON
    load_db_from_json()
    
    # 2. Extract
    df = extract_dataset()
    
    if df.empty:
        print("❌ No data extracted!")
        return
    
    # 3. Engineer Features
    df_enriched = engineer_features(df)
    
    # 4. Analyze
    analyze_data_quality(df_enriched)
    
    # 5. Save
    print("\n💾 Saving Datasets...")
    df_enriched.to_csv(OUTPUT_CSV)
    print(f"   ✓ Saved to {OUTPUT_CSV}")
    
    try:
        df_enriched.to_parquet(OUTPUT_PARQUET)
        print(f"   ✓ Saved to {OUTPUT_PARQUET}")
    except Exception as e:
        print(f"   ⚠ Could not save Parquet: {e}")

    print("\n✅ DONE! Dataset is ready.")
    print("\n📋 Sample Data (last 5 rows):")
    print(df_enriched[['total_sales', 'orders_count', 'items_sold', 'total_expenses', 'gross_profit']].tail())


if __name__ == "__main__":
    main()
