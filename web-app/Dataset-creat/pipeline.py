import sqlite3
import pandas as pd
import re
import os
from sqlalchemy import create_engine, text

# Configuration
SQL_DUMP_PATH = "../cafe_management (2).sql"
DB_PATH = "cafe.db"
OUTPUT_CSV = "daily_cafe_dataset.csv"
OUTPUT_PARQUET = "daily_cafe_dataset.parquet"

def clean_sql_for_sqlite(sql_content):
    """
    Cleans MySQL specific syntax to be compatible with SQLite.
    """
    # Remove comments
    sql_content = re.sub(r'--.*', '', sql_content)
    sql_content = re.sub(r'/\*.*?\*/', '', sql_content, flags=re.DOTALL)
    
    # Remove SET statements
    sql_content = re.sub(r'SET @.*;', '', sql_content)
    sql_content = re.sub(r'SET SQL_MODE.*;', '', sql_content)
    sql_content = re.sub(r'SET AUTOCOMMIT.*;', '', sql_content)
    sql_content = re.sub(r'START TRANSACTION;', '', sql_content)
    sql_content = re.sub(r'SET time_zone.*;', '', sql_content)
    sql_content = re.sub(r'SET NAMES.*;', '', sql_content)
    
    # Remove ENGINE=InnoDB and other table options
    sql_content = re.sub(r'ENGINE=InnoDB.*?;', ';', sql_content)
    sql_content = re.sub(r'DEFAULT CHARSET=.*?;', ';', sql_content)
    sql_content = re.sub(r'COLLATE=.*?;', ';', sql_content)
    sql_content = re.sub(r'CHARACTER SET [a-zA-Z0-9_]+', '', sql_content)
    sql_content = re.sub(r'COLLATE [a-zA-Z0-9_]+', '', sql_content)
    
    # Fix timestamp default (MySQL uses CURRENT_TIMESTAMP, SQLite supports it but ON UPDATE is tricky)
    # Remove ON UPDATE CURRENT_TIMESTAMP
    sql_content = re.sub(r'ON UPDATE CURRENT_TIMESTAMP', '', sql_content, flags=re.IGNORECASE)
    
    # Replace \' with '' for escaping in text (if needed, though SQL dumps often use '')
    # Check if backslash escapes are used. MySQL dump often uses \'.
    # sql_content = sql_content.replace("\\'", "''") 
    
    # Remove unsigned attributes (not supported in SQLite)
    sql_content = re.sub(r' unsigned', '', sql_content, flags=re.IGNORECASE)
    
    # Int(11) -> Integer
    sql_content = re.sub(r'int\(\d+\)', 'INTEGER', sql_content, flags=re.IGNORECASE)
    sql_content = re.sub(r'tinyint\(\d+\)', 'INTEGER', sql_content, flags=re.IGNORECASE)
    
    # Enum -> Text
    sql_content = re.sub(r'enum\([^)]+\)', 'TEXT', sql_content, flags=re.IGNORECASE)
    
    # Remove COMMENT '...'
    sql_content = re.sub(r"COMMENT '[^']*'", "", sql_content, flags=re.IGNORECASE)
    
    return sql_content

def load_db_from_sql():
    print("🚀 Loading and cleaning SQL dump...")
    
    with open(SQL_DUMP_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    clean_content = clean_sql_for_sqlite(content)
    
    # Create valid SQLite statements
    statements = clean_content.split(';')
    
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("📦 Executing SQL statements into SQLite...")
    success_count = 0
    error_count = 0
    
    for statement in statements:
        if statement.strip():
            try:
                cursor.execute(statement)
                success_count += 1
            except sqlite3.Error as e:
                # Ignore expected errors like distinct syntax differences that regex didn't catch
                # but print them just in case
                if "Orders" in statement or "CREATE TABLE" in statement:
                     print(f"❌ Error executing statement: {e}")
                     print(f"   Statement snippet: {statement[:100]}...")
                error_count += 1
                
    conn.commit()
    conn.close()
    print(f"✅ Database loaded. Success: {success_count}, Errors: {error_count}")

def extract_dataset():
    print("🔍 Extracting aggregated dataset...")
    engine = create_engine(f'sqlite:///{DB_PATH}')
    
    query = """
    WITH 
    OrderMetrics AS (
        SELECT 
            strftime('%Y-%m-%d', orderDate) as day_date,
            COUNT(idOrder) as orders_count,
            SUM(totalAmount) as total_sales,
            AVG(totalAmount) as average_order_value,
            SUM(discount) as total_discounts,
            
            -- Shift Logic (Morning: 06:00-15:00, Evening: 15:00-04:00 next day approx)
            -- Simplification: Just split by hour 15 for this dataset
            SUM(CASE WHEN CAST(strftime('%H', orderDate) AS INT) < 15 THEN totalAmount ELSE 0 END) as morning_shift_sales,
            SUM(CASE WHEN CAST(strftime('%H', orderDate) AS INT) >= 15 THEN totalAmount ELSE 0 END) as evening_shift_sales
            
        FROM Orders
        WHERE status = 'completed'
        GROUP BY 1
    ),
    PaymentMetrics AS (
        SELECT
            strftime('%Y-%m-%d', o.orderDate) as day_date,
            SUM(CASE WHEN p.paymentMethod = 'cash' THEN p.amountReceived ELSE 0 END) as cash_inflow,
            -- If card payments existed they would be here. Assuming most are cash based on dump.
            SUM(p.changeDue) as total_change_given
        FROM Payments p
        JOIN Orders o ON p.orderId = o.idOrder
        WHERE o.status = 'completed'
        GROUP BY 1
    ),
    ItemsMetrics AS (
        SELECT
            strftime('%Y-%m-%d', o.orderDate) as day_date,
            SUM(oi.quantity) as items_sold
        FROM OrderItems oi
        JOIN Orders o ON oi.orderId = o.idOrder
        WHERE o.status = 'completed'
        GROUP BY 1
    ),
    ExpenseMetrics AS (
        SELECT
            strftime('%Y-%m-%d', expenseDate) as day_date,
            SUM(amount) as total_expenses
        FROM Expenses
        GROUP BY 1
    ),
    InventoryMetrics AS (
        SELECT
            strftime('%Y-%m-%d', transactionDate) as day_date,
            SUM(CASE WHEN transactionType = 'waste' THEN ABS(quantity) ELSE 0 END) as waste_qty,
            SUM(CASE WHEN transactionType = 'purchase' THEN quantity ELSE 0 END) as purchase_qty
        FROM InventoryTransactions
        GROUP BY 1
    )
    
    SELECT 
        COALESCE(om.day_date, em.day_date, im.day_date) as day,
        
        -- Sales Features
        COALESCE(om.total_sales, 0) as total_sales,
        COALESCE(om.orders_count, 0) as orders_count,
        COALESCE(om.average_order_value, 0) as average_order_value,
        COALESCE(om.total_discounts, 0) as discounts,
        COALESCE(itm.items_sold, 0) as items_sold,
        
        -- Payment Features
        COALESCE(pm.cash_inflow, 0) - COALESCE(pm.total_change_given, 0) as net_cash_sales,
        -- Card sales = Total - Net Cash (approx)
        (COALESCE(om.total_sales, 0) - (COALESCE(pm.cash_inflow, 0) - COALESCE(pm.total_change_given, 0))) as card_sales_approx,
        
        -- Shift Features
        COALESCE(om.morning_shift_sales, 0) as morning_shift_sales,
        COALESCE(om.evening_shift_sales, 0) as evening_shift_sales,
        
        -- Expenses
        COALESCE(em.total_expenses, 0) as total_expenses,
        
        -- Inventory
        COALESCE(inv.waste_qty, 0) as inventory_waste_qty,
        COALESCE(inv.purchase_qty, 0) as inventory_purchase_qty,
        
        -- Profitability
        (COALESCE(om.total_sales, 0) - COALESCE(em.total_expenses, 0)) as net_profit,
        CASE WHEN COALESCE(om.total_sales, 0) > 0 THEN 
             ((COALESCE(om.total_sales, 0) - COALESCE(em.total_expenses, 0)) / COALESCE(om.total_sales, 0)) * 100 
             ELSE 0 END as distinct_profit_margin
             
    FROM OrderMetrics om
    LEFT JOIN PaymentMetrics pm ON om.day_date = pm.day_date
    LEFT JOIN ItemsMetrics itm ON om.day_date = itm.day_date
    FULL OUTER JOIN ExpenseMetrics em ON om.day_date = em.day_date
    LEFT JOIN InventoryMetrics inv ON COALESCE(om.day_date, em.day_date) = inv.day_date
    ORDER BY day ASC;
    """
    
    # Note: SQLite doesn't support FULL OUTER JOIN directly. 
    # We will simulate it using LEFT JOIN UNION ALL LEFT JOIN or just use Pandas merge which is easier.
    # Let's switch to extracting raw frames and merging in Pandas for robustness.
    
    print("   ↳ Fetching raw tables for Pandas processing...")
    
    # 1. Financial Source of Truth: DailyReceipts
    # Because Payments table is empty and Orders status is mostly 'pending',
    # DailyReceipts contains the actual consolidated sales figures.
    df_receipts = pd.read_sql_query("""
        SELECT 
            strftime('%Y-%m-%d', receiptDate) as day,
            totalSales, totalExpenses, closingCash
        FROM DailyReceipts
    """, engine)
    
    # 2. Orders Source: Include 'pending', 'preparing', 'ready', 'completed' (Exclude cancelled)
    # This provides the item-level granularity (counts, items sold) even if status is stuck.
    df_orders = pd.read_sql_query("""
        SELECT 
            strftime('%Y-%m-%d', orderDate) as day,
            idOrder, totalAmount, discount,
            strftime('%H', orderDate) as hour
        FROM Orders 
        WHERE status != 'cancelled'
    """, engine)
    
    df_order_items = pd.read_sql_query("""
        SELECT 
            strftime('%Y-%m-%d', o.orderDate) as day,
            oi.quantity
        FROM OrderItems oi
        JOIN Orders o ON oi.orderId = o.idOrder
        WHERE o.status != 'cancelled'
    """, engine)
    
    df_inventory = pd.read_sql_query("""
        SELECT strftime('%Y-%m-%d', transactionDate) as day, transactionType, quantity 
        FROM InventoryTransactions
    """, engine)

    # --- Processing ---
    
    # 1. Financials from Receipts
    daily_financials = df_receipts.groupby('day').agg({
        'totalSales': 'sum',
        'totalExpenses': 'sum', # Note: Expenses table is more detailed, but Receipts has a summary.
        'closingCash': 'sum'
    }).rename(columns={'totalSales': 'total_sales', 'totalExpenses': 'receipt_expenses', 'closingCash': 'cash_sales'})
    
    # Note: We also have the detailed Expenses table. Let's assume Expenses table is GRANULAR and Receipts is AGGREGATE.
    # We will use Expenses table for expense details if available, but Receipts for the Sales.
    df_expenses_detailed = pd.read_sql_query("SELECT strftime('%Y-%m-%d', expenseDate) as day, amount FROM Expenses", engine)
    daily_expenses = df_expenses_detailed.groupby('day')['amount'].sum().rename('total_expenses')
    
    # 2. Order Metadata (Counts, Shifts)
    daily_orders = df_orders.groupby('day').agg({
        'idOrder': 'count',
        'discount': 'sum'
    }).rename(columns={'idOrder': 'orders_count', 'discount': 'discounts'})
    
    # Shifts
    df_orders['shift'] = df_orders['hour'].astype(int).apply(lambda h: 'morning' if h < 15 else 'evening')
    shift_sales = df_orders.groupby(['day', 'shift'])['totalAmount'].sum().unstack(fill_value=0)
    shift_sales.columns = [f'{c}_shift_sales' for c in shift_sales.columns]
    
    # 3. Items
    daily_items = df_order_items.groupby('day')['quantity'].sum().rename('items_sold')
    
    # 5. Inventory
    waste = df_inventory[df_inventory['transactionType'] == 'waste'].groupby('day')['quantity'].sum().abs().rename('inventory_waste_qty')
    usage = df_inventory[df_inventory['transactionType'] == 'usage'].groupby('day')['quantity'].sum().abs().rename('inventory_usage_qty')
    
    # Use Sales from Receipts as primary, fallback to Orders Aggregation if Receipts missing?
    # Actually, let's prioritize Receipts for 'total_sales' as the database seems to rely on it.
    
    # --- MERGE ALL ---
    
    # Determined Start Date: Use First Order Date (Operations Start)
    if not daily_orders.empty:
        start_date = pd.to_datetime(daily_orders.index.min())
    else:
        start_date = pd.to_datetime(daily_financials.index.min())
        
    all_dates = pd.concat([
        pd.Series(pd.to_datetime(daily_orders.index)),
        pd.Series(pd.to_datetime(daily_financials.index))
    ]).unique()
    
    final_end_date = max(pd.to_datetime(all_dates))
    
    full_daterange = pd.date_range(start=start_date, end=final_end_date)
    df_master = pd.DataFrame(index=full_daterange.strftime('%Y-%m-%d'))
    df_master.index.name = 'day'
    
    # Join
    df_final = df_master.join(daily_financials) \
        .join(daily_orders) \
        .join(shift_sales) \
        .join(daily_items) \
        .join(daily_expenses) \
        .join(waste) \
        .join(usage)
        
    # Fill NaNs with 0
    df_final.fillna(0, inplace=True)
    
    # Correction: Features Logic
    df_final['average_order_value'] = df_final.apply(lambda x: (x['total_sales'] / x['orders_count']) if x['orders_count'] > 0 else 0, axis=1)
    
    # Use granular expenses if available and > 0, otherwise use receipt expenses?
    # Let's sum them? No, duplicates. Use 'total_expenses' (Granular) as primary for Expenses.
    
    df_final['gross_profit'] = df_final['total_sales'] - df_final['total_expenses']
    df_final['profit_margin'] = df_final.apply(lambda x: (x['gross_profit'] / x['total_sales'] * 100) if x['total_sales'] > 0 else 0, axis=1)
    
    # Cash Ratio (from receipts)
    df_final['cash_ratio'] = df_final.apply(lambda x: (x['cash_sales'] / x['total_sales']) if x['total_sales'] > 0 else 0, axis=1)
    
    return df_final

def engineer_features(df):
    print("🛠 Engineering Features...")
    
    # Rolling Averages
    df['rolling_7d_sales_avg'] = df['total_sales'].rolling(window=7, min_periods=1).mean()
    df['rolling_30d_sales_avg'] = df['total_sales'].rolling(window=30, min_periods=1).mean()
    
    # Inventory Burn Rate (7-day rolling usage)
    if 'inventory_usage_qty' in df.columns:
        df['inventory_burn_rate'] = df['inventory_usage_qty'].rolling(window=7, min_periods=1).mean()
    else:
        df['inventory_burn_rate'] = 0
    
    # Growth Rates (Daily)
    df['sales_growth_rate'] = df['total_sales'].pct_change().fillna(0)
    df['expense_growth_rate'] = df['total_expenses'].pct_change().fillna(0)
    
    # Lags (Yesterday's sales) - useful for ML
    df['lag_1_sales'] = df['total_sales'].shift(1).fillna(0)
    
    return df

def main():
    if not os.path.exists(SQL_DUMP_PATH):
        print(f"❌ Error: SQL file not found at {SQL_DUMP_PATH}")
        return

    # 1. Load DB
    load_db_from_sql()
    
    # 2. Extract
    df = extract_dataset()
    
    # 3. Engineer
    df_enriched = engineer_features(df)
    
    # 4. Save
    print("💾 Saving Datasets...")
    df_enriched.to_csv(OUTPUT_CSV)
    try:
        df_enriched.to_parquet(OUTPUT_PARQUET)
        print(f"   Saved to {OUTPUT_PARQUET}")
    except Exception as e:
        print(f"   Could not save Parquet (missing dependencies?): {e}")

    print(f"   Saved to {OUTPUT_CSV}")
    print("\n✅ DONE! Dataset is ready.")
    print(df_enriched.tail())

if __name__ == "__main__":
    main()
