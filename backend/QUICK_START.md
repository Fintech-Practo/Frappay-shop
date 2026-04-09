# Quick Start Guide

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the backend folder:

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=books_db

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
```

**Replace `your_mysql_password` with your actual MySQL password.**

### 3. Setup Database

**Option A: Using MySQL Command Line**
```bash
mysql -u root -p < database/schema.sql
```

**Option B: Using MySQL Workbench**
1. Open MySQL Workbench
2. Connect to your MySQL server
3. File → Open SQL Script → Select `database/schema.sql`
4. Execute the script

**Option C: Manual Execution**
1. Open MySQL command line: `mysql -u root -p`
2. Run:
```sql
source database/schema.sql
```

### 4. Create Admin User (Optional)

Generate admin user SQL:
```bash
npm run create-admin
```

Copy the generated SQL and execute it in MySQL.

### 5. Start Server

Development mode (auto-reload):
```bash
npm run dev
```

You should see:
```
✅ MySQL connected
🚀 Server running on port 5000
```

### 6. Test API

**Option A: Automated Test Script**
```bash
npm run test-api
```

**Option B: Manual Testing**

Test health endpoint:
```bash
curl http://localhost:5000/health
```

Should return: `{"status":"ok"}`

### 7. Test Full API Flow

1. **Register a User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"user@test.com","password":"password123"}'
```

2. **Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password123"}'
```

Copy the `token` from response.

3. **Get Your Profile:**
```bash
curl http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Troubleshooting

### Database Connection Error
- Check MySQL is running: `mysql -u root -p`
- Verify `.env` file has correct credentials
- Ensure database `books_db` exists

### Port Already in Use
- Change `PORT` in `.env` file
- Or kill process using port 5000

### Module Not Found
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then `npm install`

## Next Steps

- Read `API_TESTING.md` for complete API documentation
- Use Postman/Thunder Client for easier API testing
- Check `SETUP.md` for detailed setup instructions
