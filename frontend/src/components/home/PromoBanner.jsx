import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { resolvePhotoUrl } from '@/utils/url';

export default function PromoBanner() {
  const { promo_banners } = useSiteSettings();
  const navigate = useNavigate();
  const activeFeatures = promo_banners;

  return (
    <section className="py-16">
      <div className="container-custom">

        {/* FEATURES STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {activeFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative h-48 rounded-xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
            >
              {/* Background Image (from backend later) */}
              {feature.image && (
                <img
                  src={resolvePhotoUrl(feature.image)}
                  alt={feature.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}

              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black/50" />

              {/* Content Over Image */}
              <div className="relative z-10 h-full p-4 flex flex-col justify-end text-white">
                <h3 className="font-semibold text-lg">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/80">
                  {feature.description}
                </p>
              </div>

              {/* Placeholder (until backend sends image) */}
              {!feature.image && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">
                    Image will appear here
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* E-BOOK PROMO BANNER — UPDATED */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl text-primary-foreground"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?fit=crop&w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative grid md:grid-cols-2 gap-8 p-8 md:p-12">
            {/* Left Content */}
            <div className="flex flex-col justify-center z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-accent w-fit mb-4">
                <Tablet className="h-4 w-4" />
                <span className="text-sm font-medium">E-Book Collection</span>
              </div>

              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
                Instant Access to
                <span className="block text-accent">10,000+ E-Books</span>
              </h2>

              <p className="text-white/80 mb-6">
                Download immediately after purchase. Read on any device.
                Build your digital library with textbooks, novels, and reference materials.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/products?category=ebooks">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Browse E-Books
                  </Button>
                </Link>

                <Button
                  size="lg"
                  variant="outline"
                  className="bg-secondary text-primary hover:bg-secondary/80 backdrop-blur-sm shadow-lg border-2 border-border"
                  onClick={() => navigate('/dashboard?tab=ebooks')} // ⭐ BEST WAY
                >
                  My Library
                </Button>
              </div>
            </div>


            {/* <div className="hidden md:flex items-center justify-center relative">
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="w-48 h-64 rounded-lg shadow-book overflow-hidden"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1513475382585-d06e58bcb0b1?fit=crop&w=800&q=80')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                
                <div className="absolute inset-0 bg-black/25 flex flex-col p-6">
                  <Tablet className="h-8 w-8 text-white mb-4" />
                  <div className="text-white font-display font-bold">E-Book</div>
                  <div className="mt-auto">
                    <div className="w-full h-1 bg-white/30 rounded mb-2"></div>
                    <div className="w-3/4 h-1 bg-white/30 rounded"></div>
                  </div>
                </div>
              </motion.div>
            </div> */}
          </div>
        </motion.div>
      </div>
    </section>
  );
}