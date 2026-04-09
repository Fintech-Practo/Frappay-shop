import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '../../context/WishlistContext';

export default function WishlistIcon() {
    const { wishlistCount } = useWishlist();

    return (
        <Link to="/wishlist" className="relative">
            <Button variant="ghost" size="icon">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium z-10">
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                    </span>
                )}
            </Button>
        </Link>
    );
}
