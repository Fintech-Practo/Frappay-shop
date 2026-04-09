📁 Backend Project Structure

This backend follows a layered, production-grade architecture using Node.js, Express, and PostgreSQL.
Each file and folder has a single, clear responsibility.

🔌 Core Entry Files
```
app.js              → Configures Express, middleware, routes, and global errors
server.js           → Starts the HTTP server and handles graceful shutdown
routes.js           → Central API router (maps URLs to modules)
```

⚙️ Configuration Layer (config/)
```
config/
├── db.js           → SQL connection pool
├── env.js          → Environment variable loader and config access
└── roles.js        → Role constants (USER,SELLER, ADMIN)
```

Purpose

Centralizes configuration

Avoids hard-coded values

Makes the app cloud-ready

🛡️ Middleware Layer (middlewares/)
```
middlewares/
├── auth.middleware.js        → Verifies JWT and attaches user to request
├── role.middleware.js        → Enforces role-based access (ADMIN / USER)
├── error.middleware.js       → Global error handler (prevents crashes)
└── rateLimit.middleware.js  → Protects APIs from abuse/brute force
```

Purpose

Security

Access control

Stability

🧰 Utility Layer (utils/)
```
utils/
├── hash.js          → Password hashing and comparison (bcrypt)
├── jwt.js           → JWT sign and verify helpers
└── response.js      → Standard API response formatter
```

Purpose

Reusable helpers

Keeps controllers clean

Avoids duplicated logic

🧩 Feature Modules (modules/)

Each module represents one business domain and follows the same internal pattern:
routes → controller → service → model (DB)
```
modules/
├── auth/            → User authentication (register, login)
├── user/            → User profile management
├── admin/           → Admin-only user management
├── book/            → Book catalog (admin CRUD, user read)
└── order/           → Order creation and management
```

📌 Module Structure Pattern
```
module/
├── *.routes.js      → Defines API endpoints
├── *.controller.js  → Handles HTTP request/response
├── *.service.js     → Business logic
├── *.model.js       → Database access (SQL)
└── *.schema.js      → Request validation (Joi) (if applicable)
```

👤 USER MODULE
```
user/
├── user.route.js        → Authenticated HTTP API
├── user.controller.js  → HTTP boundary & request handling
├── user.service.js     → Profile & preference logic
├── user.model.js       → User persistence & queries
```

GLOBAL REQUEST FLOW
```
CLIENT (JWT Authenticated)
        │
        ▼
┌──────────────────────────┐
│     user.route.js        │
│  URL + auth middleware   │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│  user.controller.js     │
│ HTTP ↔ domain boundary  │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│   user.service.js       │
│ Profile & preferences   │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│    user.model.js        │
│ SQL & persistence       │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│        DATABASE          │
│ users table             │
└──────────────────────────┘
```

user.route
```
AUTHENTICATED USER ONLY
 ├─ GET    /users/me
 ├─ PUT    /users/me
 ├─ GET    /users/me/preferences
 └─ PUT    /users/me/preferences
```
🧑‍💼 SELLER MODULE & ANALYTICS
```
seller/
├── seller.route.js        → Seller/Admin HTTP surface
├── seller.controller.js  → HTTP boundary & orchestration
├── seller.service.js     → Seller business workflows
├── seller.repository.js  → Analytics & revenue persistence
├── seller.constants.js   → Domain constants & enums
```
REQUEST FLOW

```
SELLER / ADMIN CLIENT
        │
        ▼
┌──────────────────────────┐
│   seller.route.js        │
│ URLs + role enforcement │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ seller.controller.js     │
│ HTTP boundary            │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ seller.service.js        │
│ Domain workflows         │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ seller.repository.js     │
│ Analytics persistence   │
└─────────────┬────────────┘
              │
              ▼
┌──────────────────────────┐
│ DATABASE                 │
│ orders, books, revenue   │
└──────────────────────────┘
```
seller.route
```
SELLER (JWT)
 ├─ GET /seller/dashboard
 ├─ GET /seller/analytics
 ├─ GET /seller/books
 ├─ GET /seller/orders

ADMIN
 └─ GET /seller/admin/revenue
```
```
Owned Tables
seller_analytics
seller_id
total_orders
gross_revenue
net_profit
total_admin_commission
average_order_value
low_stock_threshold
top_selling_book_id

admin_revenue
seller_id
order_id
order_item_id
commission_amount
commission_percentage
```


🔐 AUTH MODULE — ARCHITECTURE & FLOW
```
auth/
├── auth.route.js        → Public authentication endpoints
├── auth.controller.js  → HTTP boundary & validation
├── auth.schema.js      → Input contracts (Joi)
├── auth.service.js     → Authentication & authorization logic
```
REQUEST FLOW
```
CLIENT
  │
  ▼
auth.route.js
  │
  ▼
auth.controller.js
  │  (Joi validation)
  ▼
auth.service.js
  │  (hash / compare / JWT)
  ▼
user.model.js
  │
  ▼
DATABASE
```
auth.route
```
POST /auth/register
POST /auth/login
POST /auth/admin/login
```
```
🔑 Registration Flow
validate role ≠ ADMIN
 ↓
check email uniqueness
 ↓
hash password
 ↓
create user
 ↓
issue JWT


✔ Admin self-registration blocked
✔ Password never stored in plain text

🔓 User Login Flow
find user by email
 ↓
verify active
 ↓
block ADMIN login here
 ↓
compare password hash
 ↓
issue JWT


✔ Disabled users blocked
✔ Role-aware login

🔐 Admin Login Flow
find user
 ↓
verify ADMIN role
 ↓
compare password
 ↓
issue JWT
```



BOOKS DASHBOARD
```
book/
├── book.route.js        → Public HTTP contract
├── book.controller.js  → Express boundary & validation gateway
├── book.schema.js      → Input validation (Joi)
├── book.service.js     → Domain rules & authorization
├── book.model.js       → SQL persistence & queries
```
END-TO-END REQUEST FLOW (CANONICAL VIEW)
```
CLIENT (User / Seller / Admin)
        │
        ▼
┌────────────────────────────┐
│       book.route.js        │
│ URLs + auth + role gates   │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│    book.controller.js      │
│ HTTP ↔ domain boundary     │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│      book.schema.js        │
│ Input contract (Joi)       │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│      book.service.js       │
│ Business rules + authz     │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│       book.model.js        │
│ SQL + persistence          │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│          DATABASE           │
│ books, users               │
└────────────────────────────┘
```
Route Map (Authoritative)
```
PUBLIC
 ├─ GET    /books
 └─ GET    /books/:id

SELLER / ADMIN
 ├─ POST   /books
 ├─ PUT    /books/:id
 ├─ DELETE /books/:id
 └─ GET    /books/my-books
```
BOOK DOMAIN — ROLE & OWNERSHIP MODEL
```
USER
 └─ Read books only

SELLER
 ├─ Create books
 ├─ Update own books
 └─ Delete own books

ADMIN
 ├─ Create books
 ├─ Update any book
 └─ Delete any book
```

ORDER MODULE
```
order/
├── order.route.js        → HTTP API contract & access gates
├── order.controller.js  → HTTP boundary & validation coordinator
├── order.schema.js      → Input contracts (Joi)
├── order.service.js     → Domain logic & orchestration
├── order.model.js       → SQL persistence & transactions
```

REQUEST FLOW
```
CLIENT (Web / App / Admin)
        │
        ▼
┌──────────────────────────────┐
│        order.route.js        │
│  URL + auth + role gating   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│     order.controller.js      │
│ HTTP boundary & validation   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       order.schema.js        │
│ Joi input contracts          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       order.service.js       │
│ Business rules & workflows   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        order.model.js        │
│ SQL + ACID transactions     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│           DATABASE           │
│ orders, order_items, books  │
└──────────────────────────────┘
```
order.route
```
AUTHENTICATED USER
 ├─ POST   /orders                → createOrder
 ├─ GET    /orders/my-orders      → getMyOrders
 ├─ GET    /orders/:id            → getOrderById
 └─ PATCH  /orders/:id/cancel     → cancelOrder

ADMIN ONLY
 ├─ GET    /orders/all            → getAllOrders
 ├─ GET    /orders/stats          → getOrderStats
 └─ PATCH  /orders/:id/status     → updateOrderStatus
```


CREATE ORDER — FULL WORKFLOW

```
orderItem/
├── orderItem.route.js        → HTTP contract (URLs & access)
├── orderItem.controller.js  → Request handling & auth boundary
├── orderItem.service.js     → Domain rules & authorization logic
├── orderItem.model.js       → SQL queries & data aggregation
``` 
Input: userId, items[], shipping_address

1. Ensure items array exists
2. For each item:
   - Validate quantity > 0
   - Fetch book
   - Ensure book exists & active
   - Ensure sufficient stock
3. Calculate totalAmount
4. Build snapshot items
5. Call orderModel.create(...)
```
CANCEL ORDER — FULL WORKFLOW
```
1. Fetch order
2. Check ownership OR admin
3. Ensure not DELIVERED
4. Ensure not already CANCELLED
5. Begin transaction
6. Restore stock for each item
7. Update order status → CANCELLED
8. Commit transaction
```


orderItem
```
CLIENT (User / Seller / Admin)
        │
        ▼
┌────────────────────────────┐
│   orderItem.route.js       │
│  URL + auth middleware     │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│ orderItem.controller.js    │
│ Express boundary           │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  orderItem.service.js      │
│ Authorization + rules      │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  orderItem.model.js        │
│ SQL joins & aggregations   │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│        DATABASE             │
│ orders, order_items, books │
└────────────────────────────┘
```

🧩 Route Map
```
USER
 ├─ GET /order-items/my-items
 ├─ GET /order-items/order/:orderId
 └─ GET /order-items/:id

SELLER
 ├─ GET /order-items/seller/items
 └─ GET /order-items/seller/stats
```

❌ CANCELLATION MODULE
```
cancellation/
├── cancellation.route.js        → HTTP API surface & role gates
├── cancellation.controller.js  → HTTP boundary & validation coordinator
├── cancellation.schema.js      → Input contracts (Joi)
├── cancellation.service.js     → Domain rules & orchestration
├── cancellation.model.js       → SQL persistence & audit queries
```

REQUEST FLOW
```
CLIENT (User / Admin)
        │
        ▼
┌────────────────────────────────┐
│     cancellation.route.js      │
│ URLs + auth + role gating      │
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────────┐
│  cancellation.controller.js   │
│ HTTP boundary & validation    │
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────────┐
│   cancellation.schema.js      │
│ Joi input contracts           │
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────────┐
│  cancellation.service.js      │
│ Business rules & workflows    │
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────────┐
│   cancellation.model.js       │
│ SQL + audit persistence       │
└──────────────┬─────────────────┘
               │
               ▼
┌────────────────────────────────┐
│           DATABASE             │
│ cancellations, orders, books  │
└────────────────────────────────┘
```

cancellation.route
```
AUTHENTICATED USER
 ├─ POST   /cancellations                  → requestCancellation
 ├─ GET    /cancellations/my-cancellations → getMyCancellations
 ├─ GET    /cancellations/:id              → getCancellationById
 └─ GET    /cancellations/stats            → getCancellationStats (own)

ADMIN ONLY
 ├─ GET    /cancellations                  → getAllCancellations
 └─ PATCH  /cancellations/:id/status       → updateCancellationStatus
```
USER FLOW — REQUEST CANCELLATION
```
Input: userId, order_id, reason

1. Fetch order
2. Ensure order exists
3. Ensure order belongs to user
4. Ensure order NOT DELIVERED
5. Ensure order NOT already CANCELLED
6. Check no pending cancellation exists
7. Create cancellation with status = PENDING
```

ADMIN FLOW — APPROVE CANCELLATION (CRITICAL)
```
Input: adminId, cancellationId, status

1. Ensure admin role
2. Fetch cancellation
3. Ensure status == PENDING
4. BEGIN TRANSACTION
5. Update cancellation → APPROVED
6. Restore stock for each order item
7. Update order status → CANCELLED
8. Update cancellation → PROCESSED
9. COMMIT
```
ADMIN FLOW — REJECT CANCELLATION
```
1. Ensure admin role
2. Ensure cancellation is PENDING
3. Update cancellation → REJECTED
```


🛒 CART MODULE — COMPLETE ARCHITECTURE & FLOW
```
cart/
├── cart.route.js        → Authenticated HTTP contract
├── cart.controller.js  → HTTP boundary & validation
├── cart.schema.js      → Input validation (Joi)
├── cart.service.js     → Cart business rules & workflows
├── cart.model.js       → Cart persistence
├── cartItem.model.js   → Cart item persistence
```

END-TO-END REQUEST FLOW
```
CLIENT (JWT Authenticated)
        │
        ▼
┌────────────────────────────┐
│      cart.route.js         │
│  URLs + auth middleware    │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│   cart.controller.js       │
│ HTTP boundary + Joi check  │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│    cart.schema.js          │
│ Input contract validation  │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│    cart.service.js         │
│ Domain logic & rules       │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│  cart.model.js /           │
│  cartItem.model.js         │
│ SQL & persistence          │
└─────────────┬──────────────┘
              │
              ▼
┌────────────────────────────┐
│        DATABASE            │
│ carts, cart_items, books  │
└────────────────────────────┘
```

cart.route

```
AUTH REQUIRED
 ├─ GET    /cart
 ├─ POST   /cart
 ├─ PATCH  /cart/items/:id
 ├─ DELETE /cart/items/:id
 ├─ DELETE /cart/clear
 ├─ GET    /cart/favorites
 └─ GET    /cart/recommendations
```

