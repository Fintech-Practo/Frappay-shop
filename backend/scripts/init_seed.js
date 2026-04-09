const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const pool = require("../config/db");

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

const users = [
  { name: "Admin User", email: "admin@example.com", password: "password123", role: "ADMIN" },
];

async function seed() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log("Connected to database.");

    // 1. Seed Product Types
    console.log("Seeding product types...");
    for (const pt of productTypes) {
      await conn.execute(
        "INSERT IGNORE INTO product_types (code, label) VALUES (?, ?)",
        [pt.code, pt.label]
      );
    }

    // 2. Recursive Category Seeding
    console.log("Seeding categories...");
    async function seedCategoryTree(nodes, parentId = null, level = 0, productType = null) {
      for (const node of nodes) {
        const currentType = node.type || productType;
        const isLeaf = !node.children || node.children.length === 0;

        await conn.execute(
          `INSERT INTO categories_v2 (name, slug, parent_id, product_type_code, level, is_leaf)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           product_type_code = VALUES(product_type_code),
           level = VALUES(level),
           is_leaf = VALUES(is_leaf)`,
          [node.name, node.slug, parentId, currentType, level, isLeaf]
        );

        const [rows] = await conn.execute(
          "SELECT id FROM categories_v2 WHERE slug = ? AND parent_id <=> ?",
          [node.slug, parentId]
        );
        const categoryId = rows[0].id;

        if (node.children && node.children.length > 0) {
          await seedCategoryTree(node.children, categoryId, level + 1, currentType);
        }
      }
    }

    await seedCategoryTree(categoryTree);

    // 3. Seed Users
    console.log("Seeding users...");
    for (const user of users) {
      const [exists] = await conn.execute("SELECT id FROM users WHERE email = ?", [user.email]);
      if (exists.length === 0) {
        const passwordHash = await bcrypt.hash(user.password, 12);
        await conn.execute(
          "INSERT INTO users (name, email, password_hash, role, is_active, is_email_verified) VALUES (?, ?, ?, ?, true, true)",
          [user.name, user.email, passwordHash, user.role]
        );
        console.log(`Created user: ${user.email}`);
      } else {
        console.log(`User ${user.email} already exists.`);
      }
    }

    console.log("✅ Seeding completed successfully.");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    if (conn) conn.release();
    process.exit();
  }
}

seed();
