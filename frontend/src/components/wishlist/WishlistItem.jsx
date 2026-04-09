import { useWishlist } from '../../context/WishlistContext';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function WishlistItem({ item }) {
    const { removeFromWishlist, moveToCart } = useWishlist();
    const { user, isAuthenticated } = useAuth();
    const isRestrictedUser = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SELLER');
    const isOutOfStock = ((item.stock ?? 1) <= 0 && !item.is_unlimited_stock) && item.format?.toLowerCase() !== 'ebook';

    // item structure: { id (wishlist_id), book_id, title, price, image, rating }

    return (
        <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <Link to={`/product/${item.product_id}`} className="shrink-0">
                <img
                    src={item.image || '/placeholder.svg'}
                    alt={item.title}
                    className="w-24 h-36 object-cover rounded-md"
                    onError={(e) => { e.target.src = '/placeholder.svg'; }}
                />
            </Link>

            <div className="flex-1 min-w-0">
                <Link to={`/product/${item.product_id}`}>
                    <h3 className="text-lg font-semibold text-foreground truncate hover:text-primary">
                        {item.title}
                    </h3>
                </Link>
                <p className="text-lg font-bold text-foreground mt-1">
                    ₹{item.price}
                </p>

                {
                    item.rating > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                            <span className="text-yellow-500">★</span>
                            <span className="text-sm text-muted-foreground">{item.rating}</span>
                        </div>
                    )
                }
            </div >

            <div className="flex flex-col gap-2 shrink-0">
                <button
                    onClick={() => {
                        if (isRestrictedUser) {
                            toast.error("Admins and Sellers cannot add items to cart.");
                            return;
                        }
                        if (isOutOfStock) return;

                        moveToCart(item.id);
                    }}
                    disabled={isOutOfStock}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
                    title="Move to Cart"
                >
                    <ShoppingCart size={16} />
                    <span className="hidden sm:inline">Move to Cart</span>
                </button>

                <button
                    onClick={() => {
                        if (isRestrictedUser) {
                            toast.error("Admins and Sellers cannot use the wishlist.");
                            return;
                        }
                        removeFromWishlist(item.id);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-md hover:bg-destructive/20 focus:outline-none focus:ring-2 focus:ring-destructive"
                    title="Remove from Wishlist"
                >
                    <Trash2 size={16} />
                    <span className="hidden sm:inline">Remove</span>
                </button>
            </div>
        </div >
    );
}