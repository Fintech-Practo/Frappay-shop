import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/config/api';
import { useRef } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Star,
  Heart,
  Minus,
  Plus,
  BookOpen,
  Coins
} from 'lucide-react';
import { Layout, productService, ReviewSection, ProductRecommendations } from '@/index.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { resolvePhotoUrl } from '@/utils/url';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, addItem } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemByProductId } = useWishlist();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState('physical');
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeImage, setActiveImage] = useState(null);

  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  // const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [purchasedEbook, setPurchasedEbook] = useState(null);
  const [checkingOwnership, setCheckingOwnership] = useState(true);

  const isItemInCart = items.some(item =>
    (item.product_id === Number(id) || item.id === Number(id)) &&
    (selectedFormat === 'ebook'
      ? (item.purchase_format === 'EBOOK' || item.purchase_format === 'DIGITAL')
      : (item.purchase_format === 'PHYSICAL' || !item.purchase_format))
  );
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isRestrictedUser = user?.role === 'ADMIN' || user?.role === 'SELLER';
  const thumbnailRef = useRef(null);

  /* ---------------- FETCH PRODUCT ---------------- */
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await productService.getProductById(id);
        if (res.data.success) {
          setProduct(res.data.data);
          console.log('Fetched product:', res.data.data);
          if (res.data.data.format?.toUpperCase() === 'EBOOK') setSelectedFormat('ebook');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product) {
      setActiveImage(
        product.image_url ||
        product.image ||
        product.images?.[0] ||
        product.additional_images?.[0]
      );
    }
  }, [product]);


  /* ---------------- CHECK IF PURCHASED ---------------- */
  useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!isAuthenticated || !id) {
        setCheckingOwnership(false);
        return;
      }

      try {
        const res = await api.get('/api/orders/my-ebooks');
        if (res.data.success) {
          // Check if we have a valid ebook purchase for this product
          const foundEbook = res.data.data.find(
            (e) => String(e.product_id) === String(id) && (e.ebook_url || e.format === 'EBOOK' || e.format === 'DIGITAL')
          );
          setPurchasedEbook(foundEbook || null);
        }
      } catch (err) {
        console.error('Failed to check purchase status', err);
      } finally {
        setCheckingOwnership(false);
      }
    };

    checkPurchaseStatus();
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent mx-auto" />
        </div>
      </Layout>
    );
  }

  /* ---------------- UTILS ---------------- */
  const parseValue = (val) => {
    if (!val) return [];

    // If it's already an array, clean each element
    if (Array.isArray(val)) {
      return val.flatMap(v => parseValue(v));
    }

    if (typeof val === 'string') {
      let cleaned = val.trim();

      // Handle JSON-stringified arrays (like '["a", "b"]')
      if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            return parsed.flatMap(v => parseValue(v));
          }
        } catch (e) {
          // If JSON parse fails, strip brackets manually and proceed to comma split
          cleaned = cleaned.replace(/^\[|\]$/g, '');
        }
      }

      // Split by comma and clean up individual parts
      return cleaned.split(',')
        .map(v => v.trim()
          .replace(/^["']|["']$/g, '') // Strip leading/trailing quotes
          .replace(/[\[\]"]/g, '')      // strip any remaining brackets or rogue internal quotes
        )
        .filter(v => v && v !== 'null' && v !== 'undefined');
    }

    return [String(val).trim()];
  };

  if (!product) {
    return (
      <Layout>
        <div className="py-20 text-center">
          <h2 className="text-xl font-bold">Product not found</h2>
        </div>
      </Layout>
    );
  }

  /* ---------------- NORMALIZED DATA ---------------- */
  const productData = {
    id: product.id,
    title: product.title,
    description: product.attributes?.description || '',
    author: product.author || product.attributes?.author || '',
    format: product.format || 'PHYSICAL',
    sellingPrice: Number(product.selling_price) || 0,
    mrp: Number(product.mrp) || 0,
    stock: Number(product.stock) || 0,
    isUnlimitedStock: Boolean(product.is_unlimited_stock),
    imageUrl: product.image_url || product.image || product.images?.[0],
    additionalImages: product.additional_images || [],
    sku: product.sku || '',
    tags: parseValue(product.tags),
    category: parseValue(product.leaf_name),
    parentCategory: parseValue(product.parent_name),
    metadata: product.metadata || {},
    attributes: product.attributes || {},
  };

  // Discovery consolidation for consolidated hashtag section
  const discoveryTags = [
    ...parseValue(productData.parentCategory),
    ...parseValue(productData.category),
    ...parseValue(productData.tags),
    ...parseValue(productData.attributes?.brand),
    ...parseValue(productData.attributes?.material),
  ]
    .map(t => t.trim())
    .filter((v, i, a) => v && a.indexOf(v) === i); // Unique

  const isEbookProduct =
    productData.format?.toUpperCase() === 'EBOOK' ||
    productData.format?.toUpperCase() === 'BOTH';

  const isEbookOwned = !checkingOwnership && Boolean(purchasedEbook);


  const isOutOfStock =
    productData.format?.toUpperCase() !== 'EBOOK' && !productData.isUnlimitedStock && productData.stock <= 0;
  const displayRating = averageRating || Number(product.rating) || 0;

  const formatPrice = (p) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);


  /* ---------------- CART ---------------- */
  const handleAddToCart = async () => {
    if (isRestrictedUser) {
      toast({
        title: "Action restricted",
        description: "Admins and Sellers cannot add items to cart.",
        variant: "destructive",
      });
      return; // Stop the function here
    }

    if (checkingOwnership) {
      toast({
        title: 'Please wait',
        description: 'Checking purchase status...',
      });
      return;
    }

    if (isEbookProduct && isEbookOwned) {
      toast({
        title: 'Already purchased',
        description: 'You already own this e-book',
        variant: 'destructive',
      });
      return;
    }

    const purchaseFormat =
      productData.format === 'BOTH'
        ? selectedFormat === 'ebook'
          ? 'EBOOK'
          : 'PHYSICAL'
        : productData.format;

    try {
      await addItem(product, quantity, purchaseFormat);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 1500);
      toast({
        title: 'Added to cart',
        description: 'Item has been added to your cart',
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      toast({
        title: 'Cannot add to cart',
        description: error.message || 'Failed to add item to cart',
        variant: 'destructive',
      });
    }
  };

  const handleBuyNow = async () => {
    if (isRestrictedUser) {
      toast({
        title: "Action restricted",
        description: "Admins and Sellers cannot buy the Product..",
        variant: "destructive",
      });
      return; // Stop the function here
    }

    if (checkingOwnership) {
      toast({
        title: 'Please wait',
        description: 'Checking purchase status...',
      });
      return;
    }
    if (isEbookProduct && isEbookOwned) {
      toast({
        title: 'Already purchased',
        description: 'You already own this e-book',
        variant: 'destructive',
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to continue",
        variant: "destructive",
      });
      navigate(`/login?redirect=/product/${id}`);
      return;
    }

    const purchaseFormat =
      productData.format === 'BOTH'
        ? selectedFormat === 'ebook'
          ? 'EBOOK'
          : 'PHYSICAL'
        : productData.format;

    try {
      const res = await api.post('/api/checkout/buy-now', {
        product_id: productData.id,
        quantity,
        purchase_format: purchaseFormat,
      });

      if (res.data.success) {
        navigate(
          res.data.data.checkout_kind === 'DIGITAL'
            ? `/checkout/digital?sessionId=${res.data.data.sessionId}`
            : `/checkout/physical?sessionId=${res.data.data.sessionId}`
        );
      }
    } catch (err) {
      toast({
        title: "Purchase failed",
        description: err.response?.data?.message || "Try again",
        variant: "destructive",
      });
    }
  };


  const decodeHTML = (html) => {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  };

  const allImages = [
    productData.imageUrl,
    ...(product.additional_images || []),
  ].filter(Boolean);

  /* ---------------- UI ---------------- */
  return (
    <Layout>
      <div className="container-custom py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/products">Products</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate max-w-[300px]">{productData.title}</span>
        </nav>

        {/* MAIN GRID */}
        <div className="grid lg:grid-cols-3 gap-12">

          {/* IMAGE SECTION */}
          <div className="space-y-4 relative">

            <div className="relative flex gap-6 items-start">

              {/* MAIN IMAGE */}
              <div
                className="relative aspect-[3/4] w-full max-w-[450px] rounded-xl overflow-hidden bg-muted cursor-pointer group"
                onClick={() => setLightboxOpen(true)}
                onTouchStart={(e) => {
                  e.currentTarget.dataset.startX = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  const startX = e.currentTarget.dataset.startX;
                  const endX = e.changedTouches[0].clientX;

                  if (!startX) return;

                  const currentIndex = allImages.indexOf(activeImage);

                  if (startX - endX > 50 && currentIndex < allImages.length - 1) {
                    setActiveImage(allImages[currentIndex + 1]);
                  }

                  if (endX - startX > 50 && currentIndex > 0) {
                    setActiveImage(allImages[currentIndex - 1]);
                  }
                }}
              >

                <img
                  src={resolvePhotoUrl(activeImage)}
                  alt={productData.title}
                  className="w-full h-full object-cover"
                />

                {/* DISCOUNT BADGE */}
                {productData.mrp > productData.sellingPrice && (
                  <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground z-20">
                    {Math.round(
                      ((productData.mrp - productData.sellingPrice) / productData.mrp) * 100
                    )}
                    % OFF
                  </Badge>
                )}

                {/* WISHLIST BUTTON */}
                {!checkingOwnership && !(isEbookProduct && isEbookOwned) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "absolute top-4 right-4 h-9 w-9 rounded-full shadow-md z-20 transition-all",
                      isInWishlist(productData.id)
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        : "bg-card/90 hover:bg-card hover:text-red-500"
                    )}
                    onClick={async (e) => {
                      e.stopPropagation();

                      if (isRestrictedUser) {
                        toast({ title: "Restricted", description: "Admins/Sellers cannot use wishlist.", variant: "destructive" });
                        return;
                      }
                      const wishlistItem =
                        getWishlistItemByProductId(productData.id);

                      try {
                        if (!isInWishlist(productData.id)) {
                          await addToWishlist(productData.id);
                          toast({ title: "Added to wishlist" });
                        } else if (wishlistItem) {
                          await removeFromWishlist(wishlistItem.id);
                          toast({ title: "Removed from wishlist" });
                        }
                      } catch (error) {
                        toast({
                          title: "Cannot update wishlist",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Heart
                      className={cn(
                        "h-5 w-5",
                        isInWishlist(productData.id)
                          ? "fill-current text-primary"
                          : "fill-none stroke-current text-primary"
                      )}
                    />
                  </Button>
                )}
              </div>

            </div>

            {/* THUMBNAILS WITH ARROWS */}
            {allImages.length > 1 && (
              <div className="relative">
                {/* LEFT ARROW */}
                <button
                  type="button"
                  onClick={() => {
                    const i = allImages.indexOf(activeImage);
                    if (i > 0) setActiveImage(allImages[i - 1]);
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow rounded-full p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* THUMBNAIL CONTAINER */}
                <div
                  ref={thumbnailRef}
                  className="flex gap-3 overflow-hidden px-10"
                >
                  {allImages.map((img, index) => (
                    <div
                      key={index}
                      onClick={() => setActiveImage(img)}
                      className={`w-20 h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition
              ${activeImage === img
                          ? "border-primary"
                          : "border-transparent hover:border-border"
                        }`}
                    >
                      <img
                        src={resolvePhotoUrl(img)}
                        alt={`Thumbnail ${index}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* RIGHT ARROW */}
                <button
                  type="button"
                  onClick={() => {
                    const i = allImages.indexOf(activeImage);
                    if (i < allImages.length - 1) setActiveImage(allImages[i + 1]);
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow rounded-full p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>




          {/* INFO */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="text-3xl font-bold">{productData.title}</h1>
            {productData.author && (
              <p className="text-muted-foreground">
                by <span className="text-primary">{productData.author}</span>
              </p>
            )}

            {/* Rating */}
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-5 w-5',
                    i < Math.round(displayRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  )}
                />
              ))}
              <span className="font-medium">
                {displayRating > 0 ? displayRating.toFixed(1) : 'No rating'}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold">{formatPrice(productData.sellingPrice)}</span>
                {productData.mrp > productData.sellingPrice && (
                  <span className="line-through text-muted-foreground">
                    {formatPrice(productData.mrp)}
                  </span>
                )}
              </div>
            </div>

            {/* Quantity + Cart */}
            {/* Quantity */}

            {/* Format Selection - Only show if format is BOTH */}
            {productData.format === 'BOTH' && (
              <div className="flex gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                <Button
                  variant={selectedFormat === 'physical' ? 'default' : 'outline'}
                  onClick={() => setSelectedFormat('physical')}
                  className="flex-1"
                >
                  Physical Book
                </Button>
                <Button
                  variant={selectedFormat === 'ebook' ? 'default' : 'outline'}
                  onClick={() => setSelectedFormat('ebook')}
                  className="flex-1"
                >
                  E-Book
                </Button>
              </div>
            )}

            {/* Quantity - Hide if EBOOK format or EBOOK selected or Purchased Ebook (and viewing ebook) */}
            {productData.format !== 'EBOOK' && selectedFormat !== 'ebook' && (
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>

                  <span className="w-12 text-center font-semibold">{quantity}</span>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Reward Coins Badge - Strategic Placement near Add to Cart */}
            {product.earnable_coins > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">

                <Coins className="h-3.5 w-3.5" />

                +{product.earnable_coins}

                <span className="text-[10px] font-medium opacity-70">
                  coins
                </span>

              </span>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isEbookProduct && isEbookOwned ? (

                <Button
                  size="lg"
                  className="col-span-1 sm:col-span-2 h-12 gap-2"
                  onClick={() => {
                    if (!purchasedEbook?.ebook_url) {
                      toast({
                        title: 'Unavailable',
                        description: 'E-book content is not available yet.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    navigate(`/ebooks/${purchasedEbook.order_id}/read/${productData.id}`);
                  }}
                >
                  <BookOpen className="h-5 w-5" />
                  View Ebook
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="btn-accent h-12"
                    disabled={isOutOfStock || checkingOwnership || (selectedFormat === 'ebook' && isItemInCart)}
                    onClick={handleAddToCart}
                  >
                    {isItemInCart && selectedFormat === 'ebook'
                      ? 'Already in Cart'
                      : addedToCart
                        ? 'Added ✓'
                        : 'Add to Cart'}
                  </Button>

                  <Button
                    size="lg"
                    className="h-12"
                    disabled={isOutOfStock || checkingOwnership}
                    onClick={handleBuyNow}
                  >
                    Buy Now
                  </Button>
                </>
              )}
            </div>


            {/* METADATA & HASHTAGS */}
            <div className="pt-4 flex flex-wrap gap-y-1">
              {productData.sku && (
                <div className="mr-4 mb-2 flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">SKU</span>
                  <span className="text-sm font-medium">{productData.sku}</span>
                </div>
              )}

              {/* Render Consolidated Discovery Tags */}
              <div className="w-full flex flex-wrap items-center mt-2">
                {discoveryTags.map(tag => (
                  <Link key={tag} to={`/products?search=${encodeURIComponent('#' + tag)}`}>
                    <Badge
                      variant="outline"
                      className="mr-2 mb-2 hover:bg-primary/10 hover:border-primary transition-all cursor-pointer text-xs font-semibold py-1 px-3 border-muted-foreground/20 text-muted-foreground hover:text-primary"
                    >
                      #{tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="pt-8 border-t">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              {productData.description ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: decodeHTML(productData.description),
                  }}
                />
              ) : (
                <p className="text-muted-foreground">No description available.</p>
              )}
            </div>

            <ReviewSection
              bookId={id}
              onReviewsFetched={(count, avgRating) => {
                setReviewCount(count);
                setAverageRating(avgRating);
              }}
            />

          </div>
        </div>

        {/* RECOMMENDATIONS – FULL WIDTH */}
        <div className="mt-20">
          <ProductRecommendations
            currentProductId={productData.id}
            title="More books you may like"
          />
        </div>
      </div>


      {/* FULLSCREEN LIGHTBOX */}
      {
        lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Close on ESC */}
            <div
              tabIndex={0}
              autoFocus
              onKeyDown={(e) => {
                const currentIndex = allImages.indexOf(activeImage);

                if (e.key === "Escape") setLightboxOpen(false);

                if (e.key === "ArrowRight" && currentIndex < allImages.length - 1) {
                  setActiveImage(allImages[currentIndex + 1]);
                }

                if (e.key === "ArrowLeft" && currentIndex > 0) {
                  setActiveImage(allImages[currentIndex - 1]);
                }
              }}
              className="outline-none w-full h-full flex items-center justify-center"
            >
              {/* Left Arrow */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = allImages.indexOf(activeImage);
                  if (currentIndex > 0) {
                    setActiveImage(allImages[currentIndex - 1]);
                  }
                }}
                className="absolute left-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Image */}
              <motion.img
                key={activeImage}
                src={resolvePhotoUrl(activeImage)}
                alt="Full view"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="max-h-[90vh] max-w-[90vw] object-contain"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => {
                  e.currentTarget.dataset.startX = e.touches[0].clientX;
                }}
                onTouchEnd={(e) => {
                  const startX = e.currentTarget.dataset.startX;
                  const endX = e.changedTouches[0].clientX;
                  const currentIndex = allImages.indexOf(activeImage);

                  if (!startX) return;

                  if (startX - endX > 50 && currentIndex < allImages.length - 1) {
                    setActiveImage(allImages[currentIndex + 1]);
                  }

                  if (endX - startX > 50 && currentIndex > 0) {
                    setActiveImage(allImages[currentIndex - 1]);
                  }
                }}
              />

              {/* Right Arrow */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = allImages.indexOf(activeImage);
                  if (currentIndex < allImages.length - 1) {
                    setActiveImage(allImages[currentIndex + 1]);
                  }
                }}
                className="absolute right-6 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </motion.div>
        )
      }

    </Layout >
  );
}