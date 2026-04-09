import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { motion } from 'framer-motion';
import api from '@/config/api';
import orderService from '@/components/features/order/services/order.service';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/products/components/ProductCard';
import MyEbooks from '@/components/features/custoumer/components/MyEbooks';
import MyRefunds from '@/components/features/custoumer/components/MyRefunds';
import WalletPage from '@/components/features/custoumer/pages/WalletPage';
import {
  User,
  Package,
  BookOpen,
  Heart,
  MapPin,
  Settings,
  ChevronRight,
  Download,
  TrendingUp,
  Clock,
  ShoppingBag,
  IndianRupee,
  Eye,
  Image as ImageIcon,
  Bell,
  Wallet,
  RefreshCw,
  Check,
  Coins,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import WalletCard from '@/components/features/custoumer/components/WalletCard';

export default function CustomerDashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items: wishlistItems, loading: wishlistLoading, removeFromWishlist, refreshWishlist } = useWishlist();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
    activeWishlist: 0,
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [notifPage, setNotifPage] = useState(1);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [walletHistory, setWalletHistory] = useState([]);
  const [walletLoading, setWalletLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Sync tab with URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const path = location.pathname;

    if (tabParam) {
      setActiveTab(tabParam);
    } else if (path.includes('/dashboard/orders')) {
      setActiveTab('orders');
    } else if (path.includes('/dashboard/wallet')) {
      setActiveTab('wallet');
    } else if (path.includes('/dashboard/ebooks')) {
      setActiveTab('ebooks');
    } else if (path.includes('/dashboard/notifications')) {
      setActiveTab('notifications');
    } else if (path.includes('/dashboard/refunds')) {
      setActiveTab('refunds');
    } else {
      setActiveTab('overview');
    }

    loadDashboardData();
  }, [isAuthenticated, user, location.pathname]);


  // Update stats when wishlist changes
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      activeWishlist: wishlistItems.length,
    }));
  }, [wishlistItems.length]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch orders, addresses, and stats in parallel
      const [ordersRes, addressesRes] = await Promise.all([
        orderService.getMyOrders({ limit: 20 }),
        api.get('/api/addresses'),
      ]);

      if (ordersRes.data.success) {
        console.log('User orders fetched:', ordersRes.data.data);

        const fetchedOrders = ordersRes.data.data || [];
        setOrders(fetchedOrders);

        // Calculate stats
        const validOrders = fetchedOrders.filter(o => o.status !== 'CANCELLED');
        const totalOrders = validOrders.length;
        const totalSpent = validOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
        const pendingOrders = fetchedOrders.filter(o => ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(o.status)).length;
        const deliveredOrders = fetchedOrders.filter(o => o.status === 'DELIVERED').length;

        setStats({
          totalOrders,
          totalSpent,
          pendingOrders,
          deliveredOrders,
          activeWishlist: wishlistItems.length,
        });
      }

      if (addressesRes.data.success) {
        setAddresses(addressesRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      console.error('Error response:', error.response?.data);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. Please refresh the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
      SHIPPED: { label: 'Shipped', className: 'bg-indigo-100 text-indigo-800' },
      DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
      CANCEL_REQUESTED: { label: 'Cancellation Pending', className: 'bg-orange-100 text-orange-800' },
      RTO_INITIATED: { label: 'Returning to Seller', className: 'bg-pink-100 text-pink-800' },
      RTO_DELIVERED: { label: 'Returned to Seller', className: 'bg-pink-200 text-pink-900' },
      COMPLETED: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={cn("px-2.5 py-0.5 rounded-full border-0 font-medium", config.className)}>{config.label}</Badge>;
  };

  const handleCancelClick = (orderId) => {
    setOrderToCancel(orderId);
    setCancelDialogOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      const res = await api.patch(`/api/orders/${orderToCancel}/cancel`);
      if (res.data.success) {
        toast({
          title: res.data.data.status === 'CANCEL_REQUESTED' ? 'Request Submitted' : 'Order Cancelled',
          description: res.data.data.status === 'CANCEL_REQUESTED'
            ? 'We have received your cancellation request.'
            : 'Your order has been cancelled successfully.',
        });
        loadDashboardData();
        setCancelDialogOpen(false);
        setOrderToCancel(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to cancel order',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      const invoiceUrl = await orderService.getInvoiceUrl(orderId);
      if (invoiceUrl) {
        window.open(invoiceUrl, '_blank');
        toast({ title: "Success", description: "Invoice downloaded successfully." });
      } else {
        throw new Error("Invoice URL missing");
      }
    } catch (error) {
      console.error("Invoice generation failed", error);
      toast({
        title: "Download Failed",
        description: "Could not retrieve invoice.",
        variant: "destructive"
      });
    }
  };

  const fetchNotifications = async (page = 1, append = false) => {
    try {
      setNotifLoading(true);
      const res = await api.get(`/api/notifications?page=${page}&limit=20`);
      if (res.data.success) {
        const newNotifs = res.data.data.notifications || [];
        setNotifications(prev => append ? [...prev, ...newNotifs] : newNotifs);
        setNotifPage(page);

        if (res.data.data.pagination) {
          setNotifHasMore(res.data.data.pagination.hasMore);
        } else {
          setNotifHasMore(newNotifs.length === 20);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error("Failed to mark read", error);
    }
  };

  const groupedNotifications = () => {
    const today = [];
    const yesterday = [];
    const earlier = [];

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    notifications.forEach(notif => {
      const d = new Date(notif.created_at).toDateString();
      if (d === todayStr) today.push(notif);
      else if (d === yesterdayStr) yesterday.push(notif);
      else earlier.push(notif);
    });
    return { today, yesterday, earlier };
  };

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications(1, false);
    }
  }, [activeTab]);

  const fetchWalletData = async () => {
    try {
      setWalletLoading(true);
      const [walletRes, historyRes] = await Promise.all([
        api.get('/api/wallet'),
        api.get('/api/wallet/transactions'),
      ]);
      if (walletRes.data.success) setWallet(walletRes.data.data);
      if (historyRes.data.success) setWalletHistory(historyRes.data.data);
    } catch (err) {
      console.error('Wallet data fetch failed', err);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'wallet') {
      fetchWalletData();
    }
  }, [activeTab]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'orders', label: 'My Orders', icon: Package },
    { id: 'refunds', label: 'My Refunds', icon: History },
    { id: 'ebooks', label: 'My E-Books', icon: BookOpen },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'wallet', label: 'My Wallet', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'addresses', label: 'Addresses', icon: MapPin, route: '/addresses' },
    { id: 'settings', label: 'Settings', icon: Settings, route: '/settings' },
  ];

  if (loading) {
    return (
      <Layout>
        <div className="w-full px-6 py-8 text-sm">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order #{orderToCancel}?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Order</Button>
            <Button variant="destructive" onClick={confirmCancelOrder}>Yes, Cancel Order</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="w-full px-6 py-8 text-sm">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 self-start">
              <Card>
                <CardContent className="p-6">
                  {/* User info */}
                  <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                    <div className="relative">
                      {user?.profile_image_url ? (
                        <img
                          src={user.profile_image_url}
                          alt={user.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                          <User className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-foreground truncate">{user?.name}</h2>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      <Link to="/profile">
                        <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs">
                          Edit Profile
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Menu */}
                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === 'ebooks') {
                              setActiveTab('ebooks');
                            } else if (item.route) {
                              navigate(item.route);
                            } else {
                              setActiveTab(item.id);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === item.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground hover:bg-secondary'
                            }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{item.label}</span>
                          {item.id === 'wishlist' && wishlistItems.length > 0 && (
                            <Badge variant="secondary" className="ml-auto">
                              {wishlistItems.length}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3 min-w-0">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">Dashboard</h1>
                  <p className="text-muted-foreground">Welcome back, {user?.name}! Here's your account overview.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                          <p className="text-2xl font-bold">{stats.totalOrders}</p>
                        </div>
                        <ShoppingBag className="h-8 w-8 text-primary opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                          <p className="text-2xl font-bold">{formatPrice(stats.totalSpent)}</p>
                        </div>
                        <IndianRupee className="h-8 w-8 text-green-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
                          <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                        </div>
                        <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Wishlist Items</p>
                          <p className="text-2xl font-bold">{stats.activeWishlist}</p>
                        </div>
                        <Heart className="h-8 w-8 text-red-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Access - My E-Books */}
                <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">My E-Books</h3>
                          <p className="text-sm text-muted-foreground">
                            Access and download all your purchased e-books
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => setActiveTab('ebooks')}>
                        View E-Books
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>Your latest order history</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('orders')}>
                        View All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {orders.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">You haven't placed any orders yet</p>
                        <Link to="/products">
                          <Button>Start Shopping</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orders.slice(0, 3).map((order) => (
                          <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors min-w-0">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold">Order #{order.id}</span>
                                {getStatusBadge(order.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(order.created_at)} • {formatPrice(order.total_amount)}
                              </p>
                              {((order.estimated_delivery) || (order.shipments?.[0]?.estimated_delivery)) && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                <p className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3" />
                                  Est. Delivery: {formatDate(order.estimated_delivery || order.shipments[0].estimated_delivery)}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground mt-1">
                                {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link to={`/orders/${order.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-3xl font-bold text-foreground">My Orders</h1>
                </div>

                {orders.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                      <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
                      <Link to="/products">
                        <Button>Browse Products</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <Card key={order.id}>
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                          <div>
                            <CardTitle className="text-base">Order #{order.id}</CardTitle>
                            <CardDescription className="flex flex-col gap-1 mt-1">
                              <span>Placed on {formatDate(order.created_at)}</span>
                              {((order.estimated_delivery) || (order.shipments?.[0]?.estimated_delivery)) && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                                <span className="text-primary font-medium flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Est. Delivery: {formatDate(order.estimated_delivery || order.shipments[0].estimated_delivery)}
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          {getStatusBadge(order.status)}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3 mb-4">
                            {order.items?.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg min-w-0"
                              >
                                {item.product_image && (
                                  <img
                                    src={item.product_image}
                                    alt={item.product_title}
                                    className="w-16 h-20 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium break-words">{item.product_title || 'Unknown Product'}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Quantity: {item.quantity} × {formatPrice(item.price)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t border-border min-w-0">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Amount</p>
                              <p className="font-display text-xl font-bold">{formatPrice(order.total_amount)}</p>
                              {order.shipping_cost > 0 && (
                                <p className="text-[10px] text-muted-foreground">Incl. {formatPrice(order.shipping_cost)} Shipping</p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadInvoice(order.id)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Invoice
                              </Button>
                              {['PENDING', 'CONFIRMED', 'PAID'].includes(order.status) && order.status !== 'DELIVERED' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelClick(order.id)}
                                >
                                  Cancel Order
                                </Button>
                              )}
                              <Link to={`/orders/${order.id}`}>
                                <Button
                                  variant="default"
                                  size="sm"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Wishlist Tab */}
            {activeTab === 'wishlist' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-3xl font-bold text-foreground">My Wishlist</h1>
                  <Badge variant="secondary">{wishlistItems.length} items</Badge>
                </div>

                {wishlistLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading wishlist...</p>
                  </div>
                ) : wishlistItems.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Your wishlist is empty</h3>
                      <p className="text-muted-foreground mb-6">Start adding items you love to your wishlist</p>
                      <Link to="/products">
                        <Button>Browse Products</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistItems.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item.product || item}
                        index={0}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Notifications Tab */}
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-foreground">Notifications</h1>
                    <p className="text-muted-foreground mt-1">Stay updated with your order status and account activity.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-10 px-4"
                      onClick={() => fetchNotifications(1, false)}
                      disabled={notifLoading}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", notifLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    {notifications.some(n => !n.is_read) && (
                      <Button
                        size="sm"
                        className="rounded-xl h-10 px-4 shadow-lg shadow-primary/20"
                        onClick={async () => {
                          try {
                            await api.patch('/api/notifications/read-all');
                            fetchNotifications(1, false);
                            toast({ title: "Success", description: "All notifications marked as read" });
                          } catch (err) {
                            toast({ title: "Error", description: "Failed to mark all as read", variant: "destructive" });
                          }
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark All Read
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-8">
                  {notifications.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border flex flex-col items-center">
                      <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                        <Bell className="h-10 w-10 text-primary/20" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">No new updates</h3>
                      <p className="text-muted-foreground max-w-xs mt-2">
                        We'll notify you here about your orders, returns, and special offers.
                      </p>
                    </div>
                  ) : (
                    <>
                      {Object.entries(groupedNotifications()).map(([groupName, groupNotifs]) => {
                        if (groupNotifs.length === 0) return null;
                        return (
                          <div key={groupName} className="space-y-4">
                            <div className="flex items-center gap-4">
                              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60 shrink-0">
                                {groupName}
                              </h3>
                              <div className="h-px bg-gradient-to-r from-primary/20 to-transparent flex-1" />
                            </div>

                            {groupNotifs.map((notif) => {
                              let metadata = {};
                              try {
                                metadata = typeof notif.metadata === "string" ? JSON.parse(notif.metadata) : notif.metadata || {};
                              } catch (e) { metadata = {}; }

                              return (
                                <div
                                  key={notif.id}
                                  className={cn(
                                    "group p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                                    notif.is_read
                                      ? "bg-card border-border hover:border-primary/20"
                                      : "bg-gradient-to-br from-primary/[0.03] to-transparent border-primary/20 shadow-sm"
                                  )}
                                >
                                  {!notif.is_read && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                  )}

                                  <div className="flex items-start gap-4">
                                    <div className={cn(
                                      "w-12 h-12 rounded-xl shrink-0 flex items-center justify-center",
                                      notif.type?.includes('ORDER') ? "bg-blue-500/10 text-blue-600" :
                                        notif.type?.includes('REFUND') ? "bg-green-500/10 text-green-600" :
                                          "bg-primary/10 text-primary"
                                    )}>
                                      {notif.type?.includes('ORDER') ? <Package className="h-6 w-6" /> :
                                        notif.type?.includes('REFUND') ? <IndianRupee className="h-6 w-6" /> :
                                          <Bell className="h-6 w-6" />}
                                    </div>

                                    <div className="flex-1 min-w-0 pr-6">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-base text-foreground">
                                          {notif.title || "Update"}
                                        </h4>
                                        {!notif.is_read && (
                                          <Badge className="h-2 w-2 p-0 rounded-full bg-primary animate-pulse" />
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-w-2xl">
                                        {notif.message}
                                      </p>

                                      {metadata?.redirectUrl && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="mt-4 rounded-xl font-semibold bg-background hover:bg-primary hover:text-white transition-all shadow-sm"
                                          onClick={() => navigate(metadata.redirectUrl)}
                                        >
                                          {metadata.actionText || 'Track Status'}
                                          <ChevronRight className="h-3 w-3 ml-2" />
                                        </Button>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end gap-4 shrink-0">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60 bg-secondary/30 px-2 py-1 rounded-lg">
                                        <Clock className="h-3 w-3" />
                                        {new Date(notif.created_at).toLocaleTimeString('en-IN', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </span>
                                      {!notif.is_read && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                                          onClick={() => handleMarkRead(notif.id)}
                                        >
                                          <Check className="h-3.5 w-3.5 mr-1" />
                                          Mark Read
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                      {notifHasMore && (
                        <div className="flex justify-center pt-8">
                          <Button
                            variant="secondary"
                            className="rounded-2xl px-10 h-12 font-bold shadow-sm"
                            onClick={() => fetchNotifications(notifPage + 1, true)}
                            disabled={notifLoading}
                          >
                            {notifLoading ? 'Loading history...' : 'View Older Updates'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* My Ebooks Tab */}
            {activeTab === 'ebooks' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MyEbooks insideDashboard />
              </motion.div>
            )}

            {/* My Refunds Tab */}
            {activeTab === 'refunds' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MyRefunds />
              </motion.div>
            )}

            {/* My Wallet Tab */}
            {activeTab === 'wallet' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="font-display text-3xl font-bold text-foreground mb-2">My Wallet &amp; Rewards</h1>
                  <p className="text-muted-foreground">Manage your coins and view transaction history</p>
                </div>

                {walletLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-8">
                    {/* Left column: Wallet card + How it works */}
                    <div className="md:col-span-1 space-y-6">
                      <WalletCard wallet={wallet} showButton={false} />

                      <Card className="border border-primary/10 bg-primary/5">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Coins className="h-4 w-4 text-primary" />
                            How it works
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-3 pb-6">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="h-5">1</Badge>
                            <p>Earn coins on every order*.</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="h-5">2</Badge>
                            <p>Coins are credited after the order is successfully delivered.</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="h-5">3</Badge>
                            <p>Redeem coins during checkout to get instant discounts.</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right column: Transaction history */}
                    <div className="md:col-span-2">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-muted-foreground" />
                            Transaction History
                          </CardTitle>
                          <Button variant="outline" size="sm" onClick={fetchWalletData}>Refresh</Button>
                        </CardHeader>
                        <CardContent className="p-0">
                          {walletHistory.length === 0 ? (
                            <div className="p-12 text-center text-muted-foreground">
                              <Coins className="h-12 w-12 mx-auto mb-4 opacity-30" />
                              <p className="font-medium">No transactions yet.</p>
                              <p className="text-sm mt-1">Place an order to start earning coins!</p>
                            </div>
                          ) : (
                            <div className="max-h-[400px] overflow-y-auto divide-y divide-border [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                              {walletHistory.map((tx) => (
                                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${tx.coins > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                      <TrendingUp className={`h-4 w-4 ${tx.coins < 0 ? 'rotate-180' : ''}`} />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-sm">{tx.description}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {formatDate(tx.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`font-black text-sm ${tx.coins > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.coins > 0 ? '+' : ''}{tx.coins}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}