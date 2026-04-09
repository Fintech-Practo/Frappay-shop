# Setup Guide

## 1. Environment Variables Setup

### Step 1: Create .env file
Copy `.env.example` to `.env` and update with your MySQL credentials:

```bash
cp .env.example .env
```

### Step 2: Update .env file with your database details:
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

**Important:** Replace `your_mysql_password` with your actual MySQL root password.

## 2. Database Setup

### Step 1: Install MySQL (if not installed)
- Download MySQL from https://dev.mysql.com/downloads/mysql/
- Install and remember your root password

### Step 2: Create Database
Run the SQL script to create the database and tables:

```bash
mysql -u root -p < database/schema.sql
```

Or manually in MySQL:
1. Open MySQL command line or MySQL Workbench
2. Run: `source database/schema.sql`

### Step 3: Verify Database Connection
Start your server:
```bash
npm run dev
```

You should see: `✅ MySQL connected`

## 3. Install Dependencies

```bash
npm install
```

## 4. Start Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run on: `http://localhost:5000`

## 5. Test API Endpoints

Use the `API_TESTING.md` file or `test-api.js` script to test all endpoints.

## 6. Create Admin User (Optional)

To create an admin user directly in database:

```sql
USE books_db;

INSERT INTO users (name, email, password_hash, role, is_active) 
VALUES ('Admin User', 'admin@example.com', '$2b$10$YourHashedPasswordHere', 'ADMIN', true);
```

**Note:** Generate password hash using bcrypt before inserting.
