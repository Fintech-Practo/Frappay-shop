import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const categories = [
  {
    id: 'school-books',
    name: 'School Books',
    description: 'CBSE, ICSE & State Boards',
    image: "https://images.unsplash.com/photo-1565022536102-f7645c84354a?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8c2Nob29sJTIwYm9va3N8ZW58MHx8MHx8fDA%3D",
    count: '5,000+',
  },
  {
    id: 'reference-books',
    name: 'Reference Books',
    description: 'Competitive Exams & Academic',
    image: "https://img.freepik.com/free-photo/books-colorful-bookmarks-still-life_23-2149871509.jpg?semt=ais_hybrid&w=740&q=80",
    count: '3,500+',
  },
  {
    id: 'novels',
    name: 'Novels & Fiction',
    description: 'Bestsellers & Classics',
    image: "https://images.unsplash.com/photo-1661936901394-a993c79303c7?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZmljdGlvbiUyMGJvb2tzfGVufDB8fDB8fHww",
    count: '8,000+',
  },
  {
    id: 'notebooks',
    name: 'Notebooks',
    description: 'Ruled, Plain & Graph',
    image: "https://moonsterleather.com/cdn/shop/articles/journal_vs_notebook_1920x.jpg?v=1695818075",
    count: '2,000+',
  },
  {
    id: 'stationery',
    name: 'Stationery',
    description: 'Pens, Pencils & More',
    image: "https://media.istockphoto.com/id/1167846999/photo/education.jpg?s=612x612&w=0&k=20&c=N1nymqiKH8GkOcIYNT4EguHtMgJLKn-bIBBfC8EV-UA=",
    count: '4,500+',
  },
  {
    id: 'ebooks',
    name: 'E-Books',
    description: 'Instant Digital Access',
    image: "https://media.istockphoto.com/id/1254724408/photo/e-book-digital-technology-and-e-learning.jpg?s=612x612&w=0&k=20&c=O5P9nC2x3UaQugDPd2aXnmOdPQjNrJF5Dbx2kcLqssI=",
    count: '10,000+',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function CategorySection() {
  return (
    <section className="py-16 bg-background">
      <div className="container-custom">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Browse by Category
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find exactly what you need from our extensive collection of books,
            e-books, and stationery supplies.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {categories.map((category) => (
            <motion.div key={category.id} variants={itemVariants}>
              <Link
                to={`/products?category=${category.id}`}
                className="group relative block h-44 rounded-xl overflow-hidden
                           border border-border hover:shadow-lg transition-all"
                style={{
                  backgroundImage: category.image
                    ? `url(${category.image})`
                    : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                {/* Fallback background when image is null */}
                {!category.image && (
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/70" />
                )}

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />

                {/* Content */}
                <div className="relative z-10 h-full p-4 flex flex-col justify-end text-white">
                  <h3 className="font-semibold text-sm mb-1"
                    style={{ fontFamily: 'Georgia, serif' }}>
                    {category.name}
                  </h3>

                  <p className="text-xs opacity-90 mb-1"
                    style={{ fontFamily: 'Georgia, serif' }}>
                    {category.description}
                  </p>

                  <span className="text-xs font-medium text-white/90"
                    style={{ fontFamily: 'Georgia, serif' }}>
                    {category.count} items
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}