import { useEffect } from 'react';
import { useWishlist } from '../../context/WishlistContext';
// import WishlistItem from '../../components/wishlist/WishlistItem';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
// import Layout from '../../components/layout/Layout';
import { Layout , WishlistItem} from '@/index.js';

export default function WishlistPage() {
    const { items, loading, refreshWishlist } = useWishlist();

    useEffect(() => {
        refreshWishlist();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <Layout>
                <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-muted rounded-full">
                            <Heart size={48} className="text-muted-foreground" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Your wishlist is empty</h2>
                    <p className="text-muted-foreground mb-8">Save items you want to buy later!</p>
                    <Link
                        to="/products"
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90"
                    >
                        Continue Shopping
                    </Link>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                    <Heart className="text-primary fill-current" />
                    My Wishlist ({items.length})
                </h1>

                <div className="grid gap-4">
                    {items.map(item => (
                        <WishlistItem key={item.id} item={item} />
                    ))}
                </div>
            </div>
        </Layout>
    );
}