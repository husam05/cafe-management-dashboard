# Environment Variables for Vercel Deployment

## Required Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

### 1. DATA_SOURCE

```
DATA_SOURCE=mysql
```

### 2. DATABASE_URL

```
DATABASE_URL=mysql://USERNAME:PASSWORD@db.lenteagency.com:3306/cafe_management
```

**Replace**:

- `USERNAME` with your MySQL username
- `PASSWORD` with your MySQL password

## How to Set in Vercel:

1. Go to https://vercel.com/dashboard
2. Select your project (madeleine-cafe)
3. Go to **Settings** → **Environment Variables**
4. Add both variables above
5. Set for: **Production**, **Preview**, and **Development**
6. Click **Save**
7. Redeploy the project

## Database Credentials

You can find your credentials in:

- phpMyAdmin: http://db.lenteagency.com/phpmyadmin/
- Or check your hosting provider's control panel

## Verification

After deployment, verify:

- Dashboard loads at https://madeleine-cafe.vercel.app/
- Total Income displays correctly
- Expenses show accurate data
- Inventory items load
- No database connection errors in logs
