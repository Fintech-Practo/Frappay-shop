import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Tablet, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/utils';
import { toast } from "sonner";
import { useAuth } from '@/context/AuthContext';
import { resolvePhotoUrl } from '@/utils/url';


export default function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemByProductId } = useWishlist();

  const { user, isAuthenticated } = useAuth();
  const isRestrictedUser =
    isAuthenticated &&
    (user?.role === 'ADMIN' || user?.role === 'SELLER');
  const isWishlisted = isInWishlist(product.id);
  const wishlistItem = getWishlistItemByProductId(product.id);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRestrictedUser) {
      toast.error("Admins and Sellers cannot add items to cart.");
      return;
    }

    try {
      await addItem(product);
      toast.success("Added to cart");
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error.message || "Failed to add item to cart");
    }
  };

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRestrictedUser) {
      toast.error("Admins and Sellers cannot use the wishlist.");
      return;
    }

    try {
      if (!isWishlisted) {
        await addToWishlist(product.id);
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

  const getFormatIcon = () => {
    switch (product.format) {
      case 'ebook':
      case 'EBOOK':
        return <Tablet className="h-3 w-3" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Package className="h-3 w-3" />
            <Tablet className="h-3 w-3" />
          </div>
        );
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  // Handle various image property names
  const imageUrl = product.image_url || product.image || (product.images && product.images[0]) || '/placeholder.svg';


  const displayImage = resolvePhotoUrl(imageUrl) || '/placeholder.svg';

  const discountPercent =
    product.discount_percent
      ? Math.round(Number(product.discount_percent))
      : product.mrp && product.selling_price
        ? Math.round(((product.mrp - product.selling_price) / product.mrp) * 100)
        : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/product/${product.id}`}
        className="group block bg-card rounded-xl border border-border 
overflow-hidden hover:shadow-lg hover:border-primary/20 
transition-all duration-300 flex flex-col h-[470px]">
        {/* Image */}
        <div className="relative h-[260px] bg-secondary/50 overflow-hidden flex-shrink-0">
          <img
            src={displayImage}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder.svg';
            }}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {discountPercent > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {discountPercent}% OFF
              </Badge>
            )}
            {product.format === 'ebook' && (
              <Badge className="bg-primary text-primary-foreground">
                E-Book
              </Badge>
            )}
            {product.format === 'both' && (
              <Badge className="bg-accent text-accent-foreground">
                Physical + E-Book
              </Badge>
            )}
          </div>

          {/* Quick actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 rounded-full shadow-md transition-all duration-200",
                "hover:text-red-500 active:text-red-500",
                isWishlisted
                  ? "bg-red-50 text-red-500 hover:bg-red-100 border border-red-200"
                  : "bg-white/90 border border-white text-white hover:text-primary hover:border-white"
              )}
              onClick={handleWishlistClick}
              title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-all duration-200 fill-current",
                  isWishlisted
                    ? "fill-current text-primary"
                    : "fill-none stroke-current text-primary"
                )}
              />
            </Button>
          </div>

          {/* Add to cart button */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-[hsl(var(--foreground)/0.6)] dark:from-black/60 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">            <Button
            size="sm"
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleAddToCart}
            disabled={((product.stock ?? 1) <= 0 && !product.is_unlimited_stock) && product.format?.toLowerCase() !== 'ebook'}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          {/* Format indicator */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            {getFormatIcon()}
            <span className="capitalize">
              {product.format === 'both' ? 'Physical & E-Book' : product.format}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground text-sm leading-snug 
               line-clamp-2 min-h-[2.6rem] 
               group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          {/* Author */}
          {(product.author || product.attributes?.author) && (
            <p className="text-sm text-muted-foreground min-h-[1.25rem] line-clamp-1 break-all">
              {product.author || product.attributes?.author || ''}
            </p>


          )}

          {/* Rating */}
          <div className="flex items-center gap-2 min-h-[1.25rem]">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{product.rating || 0}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {product.reviewCount ? `(${product.reviewCount.toLocaleString()} reviews)` : ''}
            </span>
          </div>
          {/* Price */}
          <div className="flex items-center gap-2 min-h-[1.75rem]">
            <span className="font-display text-lg font-bold text-foreground">
              {formatPrice(product.selling_price ?? product.price)}
            </span>
            {product.mrp > product.selling_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.mrp ?? product.price)}
              </span>
            )}
          </div>

          {/* Stock status */}
          {product.format?.toLowerCase() !== 'ebook' && !product.is_unlimited_stock && (
            <p className="text-xs min-h-[1rem]">
              {(product.stock ?? 1) > 0
                ? <span className="text-success">In Stock</span>
                : <span className="text-destructive">Out of Stock</span>}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}