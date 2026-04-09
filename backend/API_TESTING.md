# API Testing Guide

Base URL: `http://localhost:5000/api`

## Authentication

### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "USER"
}
```

### 2. Register Seller
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Seller",
  "email": "seller@example.com",
  "password": "password123",
  "role": "SELLER"
}
```

### 3. Login User/Seller
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response includes `token` - use this in Authorization header for protected routes.

### 4. Admin Login
```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_password"
}
```

---

## Products API

### 1. Get All Products (Public)
```http
GET /api/products
```

### 2. Get Products with Filters
```http
GET /api/products?search=notebook&category_leaf_id=5&product_type_code=STATIONERY
```

### 3. Get Product by ID (Public)
```http
GET /api/products/1
```

### 4. Get Category Tree
```http
GET /api/products/tree?type=BOOK
```

### 5. Create Product (Seller/Admin - Requires Auth)
```http
POST /api/products
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

Fields:
- title: "Notebook"
- product_type_code: "NOTEBOOK"
- category_leaf_id: 10
- selling_price: 100
- image: (File - Main Image)
- images: (Files - Gallery Images)
- book_pdf: (File - Optional Ebook)
```

### 6. Update Product (Seller/Admin - Requires Auth)
```http
PUT /api/products/1
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

### 7. Delete Product (Seller/Admin - Requires Auth)
```http
DELETE /api/products/1
Authorization: Bearer YOUR_TOKEN
```

### 8. Get My Products (Seller/Admin - Requires Auth)
```http
GET /api/products/my/products
Authorization: Bearer YOUR_TOKEN
```

---

## Orders API

### 1. Create Order (Requires Auth)
```http
POST /api/orders
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "items": [
    {
      "book_id": 1,
      "quantity": 2
    },
    {
      "book_id": 2,
      "quantity": 1
    }
  ],
  "shipping_address": "123 Main St, City, Country"
}
```

### 2. Get My Orders (Requires Auth)
```http
GET /api/orders/my-orders
Authorization: Bearer YOUR_TOKEN
```

### 3. Get Order by ID (Requires Auth)
```http
GET /api/orders/1
Authorization: Bearer YOUR_TOKEN
```

### 4. Get All Orders (Admin Only - Requires Auth)
```http
GET /api/orders/all
Authorization: Bearer ADMIN_TOKEN
```

### 5. Update Order Status (Admin Only - Requires Auth)
```http
PATCH /api/orders/1/status
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "status": "CONFIRMED"
}
```

Status options: `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`

### 6. Cancel Order (Requires Auth)
```http
PATCH /api/orders/1/cancel
Authorization: Bearer YOUR_TOKEN
```

### 7. Get Order Statistics (Admin Only - Requires Auth)
```http
GET /api/orders/stats
Authorization: Bearer ADMIN_TOKEN
```

---

## User API

### 1. Get My Profile (Requires Auth)
```http
GET /api/users/me
Authorization: Bearer YOUR_TOKEN
```

### 2. Update My Profile (Requires Auth)
```http
PUT /api/users/me
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "Updated Name"
}
```

---

## Admin API

### 1. Get All Users (Admin Only - Requires Auth)
```http
GET /api/admin/users
Authorization: Bearer ADMIN_TOKEN
```

### 2. Disable User (Admin Only - Requires Auth)
```http
PATCH /api/admin/users/1/disable
Authorization: Bearer ADMIN_TOKEN
```

---

## Testing Tools

### Using cURL:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### Using Postman:
1. Import the API endpoints
2. Set base URL: `http://localhost:5000/api`
3. Add Authorization header: `Bearer YOUR_TOKEN` for protected routes

### Using Thunder Client (VS Code):
1. Install Thunder Client extension
2. Create new requests with the endpoints above
3. Set Authorization header for protected routes
