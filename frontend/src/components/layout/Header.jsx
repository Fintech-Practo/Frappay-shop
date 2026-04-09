import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  TrendingUp,
  X,
  MessageSquare,
  FileText,
  ImageIcon,
  Heart,
  BarChart3,
  BookOpen,
  ChevronDown,
  Package,
  Store,
  Bell,
  Users,
  LogOut,
  Settings,
  Tag,
  Truck,
  Wallet,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import logo from '@/assets/Logo.png';
import { WishlistIcon } from '@/index.js';
import ThemeToggle from '../ui/ThemeToggle';
import { resolvePhotoUrl } from '@/utils/url';
import NoticeBar from './NoticeBar';
import api from '@/config/api';

const categories = [
  { name: 'School Books', href: '/products?category=school-books' },
  { name: 'Reference Books', href: '/products?category=reference-books' },
  { name: 'Novels', href: '/products?category=novels' },
  { name: 'Notebooks', href: '/products?category=notebooks' },
  { name: 'Stationery', href: '/products?category=stationery' },
  { name: 'E-Books', href: '/products?category=ebooks' },
];


const roleMenus = {
  USER: [
    { label: 'Dashboard', icon: Package, to: '/dashboard' },
    { label: 'My Orders', icon: Package, to: '/dashboard/orders' },
    { label: 'My Wallet', icon: Wallet, to: '/dashboard/wallet' },
    { label: 'My E-Books', icon: BookOpen, to: '/dashboard/ebooks' },

    { label: 'Profile', icon: User, to: '/profile' },
    { label: 'Settings', icon: Settings, to: '/settings' },
  ],

  SELLER: [
    { label: 'Dashboard', to: '/seller?tab=overview', icon: TrendingUp },
    { label: 'My Products', to: '/seller?tab=products', icon: Package },
    { label: 'My Orders', to: '/seller?tab=orders', icon: ShoppingCart },
    { label: 'Analytics', to: '/seller?tab=analytics', icon: BarChart3 },
    { label: 'Logistics', to: '/seller?tab=logistics', icon: Truck },
    { label: 'Store Settings', to: '/seller?tab=store', icon: Store },
    { label: 'Profile', icon: User, to: '/seller/profile' },
    { label: 'Notifications', to: '/seller?tab=notifications', icon: Bell },
  ],

  ADMIN: [
    { label: 'Overview', to: '/admin?tab=overview', icon: BarChart3 },
    { label: 'Analytics', to: '/admin/analytics', icon: TrendingUp },
    { label: 'Users', to: '/admin?tab=users', icon: Users },
    { label: 'Sellers', to: '/admin?tab=sellers', icon: Store },
    { label: 'Orders', to: '/admin?tab=orders', icon: ShoppingCart },
    { label: 'Inventory', to: '/admin?tab=inventory', icon: Package },
    { label: 'Logistics', to: '/admin/logistics', icon: Truck },
    { label: 'Reviews', to: '/admin?tab=reviews', icon: MessageSquare },
    { label: 'Support', to: '/admin?tab=support', icon: MessageSquare },
    { label: 'Commission', to: '/admin?tab=commission', icon: Tag },
    { label: 'Audit Logs', to: '/admin?tab=audit', icon: FileText },
    { label: 'Site Assets', to: '/admin/site-settings', icon: ImageIcon },
    { label: 'Account Settings', to: '/admin?tab=settings', icon: User },
  ],
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated, logout } = useAuth();
  const { site_logo } = useSiteSettings();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Auto-fetch unread count for the notification bell
  useEffect(() => {
    if (isAuthenticated) {
      const fetchUnread = async () => {
        try {
          const res = await api.get('/api/notifications', { params: { limit: 1 } });
          if (res.data.success) {
            setUnreadCount(res.data.data.unreadCount || 0);
          }
        } catch (e) { console.error('Failed to fetch unread count', e); }
      };
      fetchUnread();
    }
  }, [isAuthenticated, location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (location.pathname === '/products') {
      navigate('/products');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchFromUrl = params.get('search') || '';
    setSearchQuery(searchFromUrl);
  }, [location.search]);


  const getDashboardLink = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'seller':
        return '/seller';
      default:
        return '/dashboard';
    }
  };



  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      {/* Top bar */}
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground h-10">
        <div className="flex items-center h-full px-3 md:px-4">

          {/* Notice Area */}
          <div className="flex-1 min-w-0 overflow-hidden text-[11px] md:text-sm">
            <NoticeBar />
          </div>

          {/* Right Side Links */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0 ml-2 text-[10px] md:text-[12px] font-bold uppercase tracking-wider">
            {(!isAuthenticated || user?.role === 'USER') && (
              <Link
                to="/seller/register"
                className="flex items-center gap-1 hover:text-accent transition-colors"
              >
                <Store className="h-6 w-6 md:h-5 md:w-5" />
                <span className="hidden md:inline">Become a Seller</span>
              </Link>
            )}

            <Link
              to="/help"
              className="flex items-center gap-1 hover:text-accent transition-colors"
            >
              <MessageSquare className="h-6 w-6 md:h-5 md:w-5" />
              <span className="hidden md:inline">Help Center</span>
            </Link>
            <div className="scale-125 md:scale-110 [&>button]:border-0 [&>button]:bg-transparent">
              <ThemeToggle />
            </div>
          </div>

        </div>
      </div>


      {/* Main header */}
      <div className="container-custom py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center  shrink-0">
            {/* <BookOpen className="h-8 w-8 text-primary" /> */}
            <img
              src={resolvePhotoUrl(site_logo)}
              alt="Books & Copies Logo"
              className="h-12 w-auto max-w-[200px] sm:h-14 sm:max-w-[250px] lg:h-16 lg:max-w-[320px] object-contain"
            />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for books, authors, publishers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-11 w-full input-focus"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" className="ml-2 h-11 px-6 btn-primary">
              Search
            </Button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex">
              <WishlistIcon />
            </div>

            {/* Notification Bell */}
            {isAuthenticated && (
              <Link to={
                user?.role === 'ADMIN' ? '/admin?tab=notifications' : 
                user?.role === 'SELLER' ? '/seller?tab=notifications' : 
                '/dashboard?tab=notifications'
              } className="relative">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-foreground group-hover:text-foreground transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center font-medium">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {isAuthenticated ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0 overflow-hidden border border-border hover:bg-muted transition-all">
                    {user?.profile_image_url ? (
                      <img
                        src={resolvePhotoUrl(user.profile_image_url)}
                        alt={user.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-background border border-border shadow-lg"
                >
                  {(roleMenus[user.role] || []).map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.label} asChild>
                        <Link to={item.to} className="cursor-pointer flex items-center">
                          <Icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="outline" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
              </Link>
            )}


          </div>
        </div>
        {/* Mobile search */}
        <form onSubmit={handleSearch} className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </header>
  );
}
