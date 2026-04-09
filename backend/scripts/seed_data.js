const bcrypt = require("bcrypt");
const path = require("path");

// Load env EXACTLY like backend
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ✅ USE EXISTING POOL (IMPORTANT)
const pool = require("../config/db");

// ─── Seed Data ────────────────────────────────────────────────────────────────

const productTypes = [
  { code: 'BOOK', label: 'Books' },
  { code: 'NOTEBOOK', label: 'Notebooks' },
  { code: 'STATIONERY', label: 'Stationery' },
];

const categoryTree = [
  /* ================= BOOKS ================= */
  {
    name: "Books", slug: "books", type: "BOOK", children: [
      {
        name: "Fiction", slug: "fiction", children: [
          { name: "Fantasy", slug: "fantasy" },
          { name: "Mystery", slug: "mystery" },
          { name: "Romance", slug: "romance" },
          { name: "Thriller", slug: "thriller" },
          { name: "Sci-Fi", slug: "sci-fi" },
          { name: "Historical Fiction", slug: "historical-fiction" },
        ]
      },
      {
        name: "Non-Fiction", slug: "non-fiction", children: [
          { name: "Biography", slug: "biography" },
          { name: "Self-Help", slug: "self-help" },
          { name: "Business", slug: "business" },
          { name: "Finance", slug: "finance" },
          { name: "Health", slug: "health" },
          { name: "Travel", slug: "travel" },
        ]
      },
      {
        name: "Academic", slug: "academic", children: [
          { name: "School Books", slug: "school-books" },
          { name: "Competitive Exams", slug: "competitive-exams" },
          { name: "Reference Books", slug: "reference-books" },
          { name: "Textbooks", slug: "textbooks" },
          { name: "Engineering", slug: "engineering" },
          { name: "Medical", slug: "medical" },
          { name: "Pharmacy", slug: "pharmacy" },
          { name: "Grammar and Improvement", slug: "grammar-improvement" },
          { name: "Essays and Letters", slug: "essays-letters" },
          { name: "Olympiad", slug: "olympiad" },
          { name: "GK and Current Affairs", slug: "gk-current-affairs" },
          { name: "Computer Science", slug: "computer-science" },
          { name: "Arts", slug: "arts" },
          { name: "Science", slug: "science" },
          { name: "Commerce", slug: "commerce" },
          { name: "Vocational", slug: "vocational" },
          { name: "Literature", slug: "literature" },
          { name: "Guide Books", slug: "guide-books" },
        ]
      },
      {
        name: "Children’s Books", slug: "childrens-books", children: [
          { name: "Storybooks", slug: "storybooks" },
          { name: "Activity Books", slug: "activity-books" },
          { name: "Educational", slug: "educational" },
        ]
      },
      { name: "Comics & Graphic Novels", slug: "comics-graphic-novels" },
      { name: "Religious & Spiritual", slug: "religious-spiritual" },
      { name: "eBooks", slug: "ebooks" },
      { name: "Law Books", slug: "law-books" },
      { name: "Dictionary", slug: "dictionary" },
      { name: "Encyclopaedia", slug: "encyclopaedia" },
    ]
  },

  /* ================= NOTEBOOKS & PAPER ================= */
  {
    name: "Notebooks & Paper Products", slug: "notebooks-paper", type: "NOTEBOOK", children: [
      {
        name: "Notebooks", slug: "notebooks", children: [
          { name: "Ruled", slug: "ruled" },
          { name: "Unruled", slug: "unruled" },
          { name: "Spiral", slug: "spiral" },
          { name: "Hardcover", slug: "hardcover" },
          { name: "Softcover", slug: "softcover" },
        ]
      },
      { name: "Journals & Diaries", slug: "journals-diaries" },
      { name: "Registers & Ledgers", slug: "registers-ledgers" },
      { name: "Planners & Organizers", slug: "planners-organizers" },
      { name: "Loose Sheets & Writing Pads", slug: "loose-sheets-pads" },
      { name: "Sticky Notes & Memo Pads", slug: "sticky-notes" },
    ]
  },

  /* ================= STATIONERY ================= */
  {
    name: "Writing Instruments", slug: "writing-instruments", type: "STATIONERY", children: [
      { name: "Pens", slug: "pens" },
      { name: "Pencils", slug: "pencils" },
      { name: "Markers & Highlighters", slug: "markers-highlighters" },
      { name: "Refills & Ink", slug: "refills-ink" },
    ]
  },
  {
    name: "Office Supplies", slug: "office-supplies", type: "STATIONERY", children: [
      { name: "Files & Folders", slug: "files-folders" },
      { name: "Staplers & Punches", slug: "staplers-punches" },
      { name: "Clips, Pins & Rubber Bands", slug: "clips-pins" },
      { name: "Tape & Adhesives", slug: "tape-adhesives" },
      { name: "Scissors & Cutters", slug: "scissors-cutters" },
    ]
  },
  {
    name: "Art & Craft Supplies", slug: "art-craft", type: "STATIONERY", children: [
      { name: "Drawing & Sketching Tools", slug: "drawing-tools" },
      { name: "Colors", slug: "colors" },
      { name: "Brushes & Accessories", slug: "brushes" },
      { name: "Craft Materials", slug: "craft-materials" },
    ]
  },
  {
    name: "Office Equipment", slug: "office-equipment", type: "STATIONERY", children: [
      { name: "Calculators", slug: "calculators" },
      { name: "Whiteboards & Notice Boards", slug: "boards" },
      { name: "Desk Organizers", slug: "desk-organizers" },
      { name: "Labelling Machines", slug: "labelling-machines" },
    ]
  },
  {
    name: "School Supplies", slug: "school-supplies", type: "STATIONERY", children: [
      { name: "School Kits", slug: "school-kits" },
      { name: "Geometry Boxes", slug: "geometry-boxes" },
      { name: "Lunch Accessories", slug: "lunch-accessories" },
      { name: "Backpacks", slug: "backpacks" },
      { name: "Water Bottles", slug: "water-bottles" },
    ]
  },
  {
    name: "Corporate & Bulk Supplies", slug: "corporate-bulk", type: "STATIONERY", children: [
      { name: "Office Stationery Kits", slug: "stationery-kits" },
      { name: "Bulk Notebooks & Papers", slug: "bulk-notebooks" },
      { name: "Printing & Copier Paper", slug: "copier-paper" },
    ]
  },
  {
    name: "Gift & Premium Stationery", slug: "gift-premium", type: "STATIONERY", children: [
      { name: "Gift Sets", slug: "gift-sets" },
      { name: "Luxury Pens", slug: "luxury-pens" },
      { name: "Designer Notebooks", slug: "designer-notebooks" },
    ]
  },
];

const products = [
  {
    title: "The Great Gatsby",
    product_type_code: "BOOK",
    category_path: "books/fiction/fantasy",
    sku: "BK-001",
    description: "A classic novel of the Jazz Age.",
    selling_price: 10.99, mrp: 15.99,
    discount_percent: 31.27,
    stock: 50, weight: 0.3,
    format: "PHYSICAL",
    commission_percentage: 10.00,
    tags: "fiction,classic,gatsby",
    attributes: { author: "F. Scott Fitzgerald" },
  },
  {
    title: "Clean Code",
    product_type_code: "BOOK",
    category_path: "books/academic/computer-science",
    sku: "BK-002",
    description: "A handbook of agile software craftsmanship.",
    selling_price: 29.99, mrp: 45.00,
    discount_percent: 33.36,
    stock: 20, weight: 0.5,
    format: "EBOOK",
    ebook_url: "https://example.com/cleancode.pdf",
    commission_percentage: 10.00,
    tags: "programming,clean-code,agile",
    attributes: { author: "Robert C. Martin" },
  },
  {
    title: "Classmate Notebook - Single Line",
    product_type_code: "NOTEBOOK",
    category_path: "notebooks-paper/notebooks/ruled",
    sku: "NB-001",
    description: "172 Pages, Single Line",
    selling_price: 50.00, mrp: 60.00,
    discount_percent: 16.67,
    stock: 100, weight: 0.2,
    format: "PHYSICAL",
    commission_percentage: 10.00,
    tags: "notebook,school,classmate",
    attributes: { brand: "Classmate", pages: 172, binding: "Soft" },
  },
  {
    title: "Parker Jotter Pen",
    product_type_code: "STATIONERY",
    category_path: "writing-instruments/pens",
    sku: "ST-001",
    description: "Ballpoint pen, Blue Ink",
    selling_price: 250.00, mrp: 300.00,
    discount_percent: 16.67,
    stock: 50, weight: 0.05,
    format: "PHYSICAL",
    commission_percentage: 10.00,
    tags: "pen,stationery,parker",
    attributes: { brand: "Parker", color: "Blue" },
  },
];

const users = [
  { name: "Admin User", email: "admin@example.com", password: "password123", role: "ADMIN" },
  { name: "Seller User", email: "seller@example.com", password: "password123", role: "SELLER" },
  { name: "John Doe", email: "john@example.com", password: "password123", role: "USER" },
  { name: "Verified Seller", email: "vseller@example.com", password: "password123", role: "SELLER" },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function seedData() {
  let conn;

  try {
    console.log("Connecting to Database...");
    conn = await pool.getConnection();
    console.log("✅ Connected");

    /* ================= PRODUCT TYPES ================= */
    console.log("\nSeeding product types...");
    for (const pt of productTypes) {
      await conn.execute(
        `INSERT IGNORE INTO product_types (code, label) VALUES (?, ?)`,
        [pt.code, pt.label]
      );
    }
    console.log("✅ Product types done");

    /* ================= COMMISSION SETTINGS ================= */
    console.log("\nSeeding commission settings...");
    await conn.execute(
      `INSERT IGNORE INTO commission_settings (type, percentage) VALUES ('GLOBAL', 10.00)`
    );
    console.log("✅ Commission settings done");

    /* ================= USERS ================= */
    console.log("\nSeeding users...");
    for (const user of users) {
      const [exists] = await conn.execute(
        "SELECT id FROM users WHERE email = ?",
        [user.email]
      );
      if (exists.length === 0) {
        const hash = await bcrypt.hash(user.password, 10);
        await conn.execute(
          `INSERT INTO users (name, email, password_hash, role, is_active, is_email_verified)
           VALUES (?, ?, ?, ?, true, true)`,
          [user.name, user.email, hash, user.role]
        );
        console.log(`  ➕ Created user: ${user.email}`);
      } else {
        console.log(`  ℹ️  User already exists: ${user.email}`);
      }
    }

    /* ================= SELLER INFO ================= */
    console.log("\nSeeding seller info...");
    const [sellers] = await conn.execute(
      "SELECT id, name, email FROM users WHERE role = 'SELLER'"
    );

    for (const seller of sellers) {
      const [siExists] = await conn.execute(
        "SELECT id FROM seller_info WHERE user_id = ?",
        [seller.id]
      );
      if (siExists.length === 0) {
        await conn.execute(
          `INSERT INTO seller_info (
            user_id, business_name, business_location,
            bank_account_number, bank_ifsc, bank_name,
            pan_number, pickup_location_name, pickup_pincode,
            approval_status, approved_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', NOW())`,
          [
            seller.id,
            `${seller.name}'s Books`,
            'Mumbai, Maharashtra',
            '123456789012',
            'SBIN0001234',
            'State Bank of India',
            'ABCDE1234F',
            'Primary',
            '400001',
          ]
        );
        console.log(`  ➕ Created seller_info for: ${seller.email}`);
      } else {
        console.log(`  ℹ️  Seller info already exists for: ${seller.email}`);
      }

      // Seller analytics record
      const [saExists] = await conn.execute(
        "SELECT id FROM seller_analytics WHERE seller_id = ?",
        [seller.id]
      );
      if (saExists.length === 0) {
        await conn.execute(
          `INSERT INTO seller_analytics (seller_id) VALUES (?)`,
          [seller.id]
        );
        console.log(`  ➕ Created seller_analytics for seller id: ${seller.id}`);
      }
    }

    /* ================= SELLER WAREHOUSES ================= */
    console.log("\nSeeding seller warehouses (pickup locations)...");

    // Specific warehouse for seller_id = 2 (FRAP PAY SHOP)
    const [sw2Exists] = await conn.execute(
      "SELECT id FROM seller_warehouses WHERE seller_id = 2"
    );
    if (sw2Exists.length === 0) {
      // Check if seller with id=2 actually exists
      const [sellerCheck] = await conn.execute(
        "SELECT id FROM users WHERE id = 2 AND role = 'SELLER'"
      );
      if (sellerCheck.length > 0) {
        await conn.execute(
          `INSERT INTO seller_warehouses
            (seller_id, pickup_location_name, pincode, warehouse_created)
           VALUES (2, 'FRAP PAY SHOPSOLUTIONSL-do-B2C', '110001', TRUE)`,
        );
        console.log("  ➕ Created warehouse 'FRAP PAY SHOPSOLUTIONSL-do-B2C' for seller_id=2");
      } else {
        console.log("  ⚠️  Seller with id=2 not found — skipping FRAP PAY SHOP warehouse");
      }
    } else {
      console.log("  ℹ️  Warehouse 'FRAP PAY SHOPSOLUTIONSL-do-B2C' already exists for seller_id=2");
    }

    // Generic warehouse for every other seller that doesn't have one
    for (const seller of sellers) {
      if (seller.id === 2) continue; // already handled above
      const [swExists] = await conn.execute(
        "SELECT id FROM seller_warehouses WHERE seller_id = ?",
        [seller.id]
      );
      if (swExists.length === 0) {
        await conn.execute(
          `INSERT INTO seller_warehouses
            (seller_id, pickup_location_name, pincode, warehouse_created)
           VALUES (?, ?, '400001', FALSE)`,
          [seller.id, `seller_${seller.id}`]
        );
        console.log(`  ➕ Created default warehouse for seller_id=${seller.id}`);
      } else {
        console.log(`  ℹ️  Warehouse already exists for seller_id=${seller.id}`);
      }
    }
    console.log("✅ Seller warehouses done");

    /* ================= CATEGORIES ================= */
    console.log("\nSeeding categories (recursive)...");

    // Map: fullPath → leaf_id
    const leafMap = {};

    // 🔁 Recursive function
    async function insertCategory(conn, node, parentId = null, level = 0, parentPath = "", productType = null) {
      const currentType = node.type || productType;

      const fullPath = parentPath
        ? `${parentPath}/${node.slug}`
        : node.slug;

      const isLeaf = !node.children || node.children.length === 0;

      // Insert or Update category
      await conn.execute(
        `INSERT INTO categories_v2 
         (name, slug, product_type_code, parent_id, level, is_leaf)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         parent_id = VALUES(parent_id),
         level = VALUES(level),
         is_leaf = VALUES(is_leaf),
         name = VALUES(name)`,
        [
          node.name,
          node.slug,
          currentType,
          parentId,
          level,
          isLeaf
        ]
      );

      // Get ID
      const [rows] = await conn.execute(
        `SELECT id FROM categories_v2 
         WHERE slug = ? AND parent_id <=> ?`,
        [node.slug, parentId]
      );

      const categoryId = rows[0].id;

      // Store leaf
      if (isLeaf) {
        leafMap[fullPath] = categoryId;
      }

      // Recurse children
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          await insertCategory(
            conn,
            child,
            categoryId,
            level + 1,
            fullPath,
            currentType
          );
        }
      }
    }

    // Run for all roots
    for (const root of categoryTree) {
      await insertCategory(conn, root, null, 0, "", root.type);
    }

    console.log("✅ Categories (recursive) done");
    /* ================= PRODUCTS ================= */
    console.log("\nSeeding products...");
    // Use the first SELLER for product ownership
    const [[primarySeller]] = await conn.execute(
      "SELECT id FROM users WHERE role = 'SELLER' LIMIT 1"
    );

    for (const p of products) {
      const key = p.category_path;
      const leafId = leafMap[key];

      if (!leafId) {
        console.warn(`  ⚠️  Skipping "${p.title}" — category "${key}" not found`);
        continue;
      }

      await conn.execute(
        `INSERT INTO products (
          product_type_code, category_leaf_id, title, sku, description,
          mrp, selling_price, discount_percent, stock, format, ebook_url,
          attributes, weight, commission_percentage, tags, is_active, seller_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, 2)
        ON DUPLICATE KEY UPDATE 
          category_leaf_id = VALUES(category_leaf_id),
          product_type_code = VALUES(product_type_code),
          is_active = true`,
        [
          p.product_type_code,
          leafId,
          p.title,
          p.sku,
          p.description,
          p.mrp,
          p.selling_price,
          p.discount_percent,
          p.stock,
          p.format,
          p.ebook_url || null,
          p.attributes ? JSON.stringify(p.attributes) : null,
          p.weight || 0,
          p.commission_percentage || 10.00,
          p.tags || null,
        ]
      );
      console.log(`  ✅ Synced product: "${p.title}" (Category: ${key})`);
    }

    console.log("\n✅ Seeding completed successfully");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ Seeding failed:", err);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

seedData();
