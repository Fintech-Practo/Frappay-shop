import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/config/api';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from "sonner";

export default function ProductRecommendations({ currentProductId, title = "More books you may like" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const scrollContainerRef = useRef(null);
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemByProductId } = useWishlist();
  const { user, isAuthenticated } = useAuth();
  const isRestrictedUser = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SELLER');

  // Fetch products on mount
  useEffect(() => {
    fetchRecommendations();
  }, [currentProductId]);

  // Check scroll position
  const checkScrollPosition = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth);
    }
  };

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      checkScrollPosition(); // Initial check
      return () => container.removeEventListener('scroll', checkScrollPosition);
    }
  }, [products]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/products?limit=15');

      if (res.data.success) {
        // Filter out current product and take 10 random products
        const productList = res.data.data?.products || res.data.data || [];
        const filteredProducts = productList
          .filter(product => product.id !== parseInt(currentProductId))
          .slice(0, 10);

        setProducts(filteredProducts);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 240; // Card width + gap
    const newScrollLeft = container.scrollLeft + (direction * scrollAmount);

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  const handleWishlistClick = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRestrictedUser) {
      toast.error("Admins and Sellers cannot use the wishlist.");
      return;
    }

    try {
      const wishlistItem = getWishlistItemByProductId(productId);

      if (!isInWishlist(productId)) {
        await addToWishlist(productId);
        toast.success("Added to wishlist");
      } else {
        if (wishlistItem) {
          await removeFromWishlist(wishlistItem.id);
          toast.success("Removed from wishlist");
        }
      }
    } catch (error) {
      console.error(error);
      if (error.message === "Please login to use wishlist") {
        toast.error("Please login to use wishlist");
      } else {
        toast.error(error.message || "Failed to update wishlist");
      }
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const getDisplayImage = (url) => {
    if (!url || url === '/placeholder.svg') return '/placeholder.svg';
    if (url.startsWith('http')) return url;
    const cleanPath = url.startsWith('/') ? url.substring(1) : url;
    return `http://localhost:5000/${cleanPath.replace(/\\/g, '/')}`;
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="py-8">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">{title}</h2>
        <div className="relative">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="flex-shrink-0 w-48">
                <div className="bg-muted animate-pulse rounded-lg">
                  <div className="aspect-[3/4] bg-muted/50 rounded-t-lg mb-3"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-muted/50 rounded"></div>
                    <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                    <div className="h-6 bg-muted/50 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No products fallback
  if (products.length === 0) {
    return (
      <div className="py-8">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-6">{title}</h2>
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-border">
          <p className="text-muted-foreground">No recommendations available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className={cn(
              "p-2 rounded-full border transition-all duration-200",
              canScrollLeft
                ? "bg-background border-border hover:bg-muted hover:border-primary cursor-pointer"
                : "bg-muted/50 border-border/50 cursor-not-allowed opacity-50"
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className={cn(
              "p-2 rounded-full border transition-all duration-200",
              canScrollRight
                ? "bg-background border-border hover:bg-muted hover:border-primary cursor-pointer"
                : "bg-muted/50 border-border/50 cursor-not-allowed opacity-50"
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product) => {
            const isWishlisted = isInWishlist(product.id);
            const imageUrl = product.image_url || product.image || (product.images && product.images[0]) || '/placeholder.svg';
            const displayImage = getDisplayImage(imageUrl);
            const hasDiscount = product.mrp > product.selling_price;

            return (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="flex-shrink-0 w-48 group block"
              >
                <div className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all duration-300 group-hover:scale-[1.02]">
                  {/* Product Image */}
                  <div className="relative aspect-[3/4] bg-secondary/50 overflow-hidden">
                    <img
                      src={displayImage}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder.svg';
                      }}
                    />

                    {/* Discount Badge */}
                    {hasDiscount && (
                      <div className="absolute top-2 left-2">
                        <div className="bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded">
                          {Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)}% OFF
                        </div>
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => handleWishlistClick(e, product.id)}
                      className={cn(
                        "absolute top-2 right-2 p-1.5 rounded-full transition-all duration-200",
                        isWishlisted
                          ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                          : "bg-card/90 hover:bg-card hover:text-primary hover:border-primary/20 text-muted-foreground border border-transparent"
                      )}
                      title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart className={cn("h-3.5 w-3.5 transition-all duration-200", isWishlisted && "fill-current")} />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    {/* Title */}
                    <h3 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2 leading-tight">
                      {product.title}
                    </h3>

                    {/* Rating */}
                    {(product.rating || product.reviewCount) && (
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{product.rating || 0}</span>
                        </div>
                        {product.reviewCount && (
                          <span className="text-xs text-muted-foreground">
                            ({product.reviewCount})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-sm font-bold text-foreground">
                        {formatPrice(product.selling_price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.mrp)}
                        </span>
                      )}
                    </div>

                    {/* Format Badge */}
                    {product.format && (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground capitalize">
                          {product.format.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Gradient Fade Edges */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-10"></div>
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10"></div>
        )}
      </div>

      {/* Hide scrollbar CSS */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}