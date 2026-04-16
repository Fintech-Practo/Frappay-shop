import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/config/api';
import SellerPayoutHistory from '@/components/features/seller/components/SellerPayoutHistory';
import { cn, getOrderDisplayStatus, STATUS_CONFIG, formatDate ,formatTime} from '@/lib/utils';
import {
  Package,
  IndianRupee,
  ShoppingCart,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Eye,
  Store,
  LogOut,
  Bell,
  AlertCircle,
  Search,
  Check,
  X,
  BarChart3,
  Truck,
  Clock,
  User,
  RefreshCw,
  Key,
  ChevronRight,
  Warehouse,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useProduct } from '@/context/ProductContext';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layout, SellerAnalytics, SellerStoreSettings, SellerProducts, SellerPasswordSettings, SellerLogistics } from '@/index.js';


export default function SellerDashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { products, loading: productsLoading, createProduct, updateProduct, deleteProduct, fetchMyProducts } = useProduct();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutsPagination, setPayoutsPagination] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [shipments, setShipments] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notifPage, setNotifPage] = useState(1);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    title: '',
    author: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    subcategory_id: '',
    format: 'PHYSICAL',
    image: null,
    book_pdf: null
  });
  const [profileForm, setProfileForm] = useState({
    business_name: '',
    business_location: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc: ''
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (productForm.category_id) {
      fetchSubcategories(productForm.category_id);
    } else {
      setSubCategories([]);
    }
  }, [productForm.category_id]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/products/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const res = await api.get(`/api/products/subcategories?category_id=${categoryId}`);
      if (res.data.success) {
        setSubCategories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch subcategories', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Check if user is a seller, if not redirect to registration
    if (user?.role !== 'SELLER') {
      // Check onboarding status
      checkSellerStatus();
      return;
    }

    // Load dashboard data
    loadDashboardData();
  }, [isAuthenticated, user]);

  const checkSellerStatus = async () => {
    try {
      const res = await api.get('/api/seller/register/status');
      if (res.data.success) {
        const status = res.data.data;
        if (!status.is_seller && status.onboarding?.approval_status !== 'APPROVED') {
          // Not a seller and not approved - redirect to registration
          navigate('/seller/register');
          return;
        }
        // If approved, reload to get updated role
        if (status.onboarding?.approval_status === 'APPROVED') {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Failed to check seller status', error);
      navigate('/seller/register');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load dashboard data in parallel
      const [dashboardRes, ordersRes, shipmentsRes, payoutsRes] = await Promise.all([
        api.get('/api/seller/dashboard'),
        api.get('/api/seller/orders', { params: { limit: 10 } }),
        api.get('/api/logistics/list?role=SELLER'),
        api.get('/api/finance/seller/payouts', { params: { page: 1, limit: 10 } })
      ]);

      if (dashboardRes.data.success) {
        const dashboard = dashboardRes.data.data;
        setLowStockProducts(dashboard.low_stock_products || []);
        setStats({
          totalProducts: dashboard.analytics?.total_products_added || 0,
          totalOrders: dashboard.analytics?.total_orders || 0,
          revenue: dashboard.analytics?.gross_revenue || 0,
          profit: dashboard.analytics?.net_profit || 0,
          pendingShipments: dashboard.pending_shipments || 0,
          pendingPayout: dashboard.payouts?.pending || 0,
          settledPayout: dashboard.payouts?.settled || 0,
          lowStockBooks: dashboard.low_stock_products?.length || 0,
          readyToPack: 0, // Will be updated from shipmentsRes
          packed: 0       // Will be updated from shipmentsRes
        });

        if (dashboard.seller_profile) {
          setSellerProfile(dashboard.seller_profile);
          setProfileForm({
            business_name: dashboard.seller_profile.business_name || '',
            business_location: dashboard.seller_profile.business_location || '',
            bank_name: dashboard.seller_profile.bank_name || '',
            bank_account_number: dashboard.seller_profile.bank_account_number || '',
            bank_ifsc: dashboard.seller_profile.bank_ifsc || ''
          });
        }
      }

      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data || []);
      }

      if (payoutsRes.data.success) {
        if (payoutsRes.data.data.pagination) {
          setPayouts(payoutsRes.data.data.data || []);
          setPayoutsPagination(prev => ({ ...prev, ...payoutsRes.data.data.pagination }));
        } else {
          // Backward compatibility
          setPayouts(payoutsRes.data.data || []);
        }
      }

      if (shipmentsRes.data.success) {
        const map = {};
        let readyCount = 0;
        let packedCount = 0;
        shipmentsRes.data.data.forEach(s => {
          map[s.order_id] = s;
          if (s.admin_status === 'AWB_ASSIGNED') readyCount++;
          if (s.admin_status === 'PACKED') packedCount++;
        });
        setShipments(map);
        setStats(prev => ({
          ...prev,
          readyToPack: readyCount,
          packed: packedCount
        }));
      }

      // Fetch Notifications if tab is notifications
      if (activeTab === 'notifications') {
        fetchNotifications();
      }

      // Fetch products via ProductContext
      await fetchMyProducts();
    } catch (error) {
      console.error('Failed to load dashboard data', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        navigate('/seller/register');
      }
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
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
      maximumFractionDigits: 0,
    }).format(price);
  };

  const fetchPayouts = async (page) => {
    try {
      const res = await api.get('/api/finance/seller/payouts', { params: { page, limit: 10 } });
      if (res.data.success && res.data.data.pagination) {
        setPayouts(res.data.data.data || []);
        setPayoutsPagination(prev => ({ ...prev, ...res.data.data.pagination }));
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch payouts', variant: 'destructive' });
    }
  };

  const renderStatusBadge = (order, shipment) => {
    // Combine order and shipment for the helper
    const orderWithShipment = { ...order, shipments: shipment ? [shipment] : order.shipments };
    const displayStatus = getOrderDisplayStatus(orderWithShipment);
    const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.UNKNOWN;

    return (
      <Badge className={cn("px-2 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap", config.color)}>
        {config.label}
      </Badge>
    );
  };





  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const res = await api.put('/api/seller/profile', profileForm);
      if (res.data.success) {
        toast({
          title: 'Success',
          description: 'Profile updated successfully'
        });
        setEditingProfile(false);
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleExportCSV = () => {
    const rows = orders.map(order => ({
      payout_id: `PAY-ORD-${order.id}`,
      order_id: order.id,
      amount: order.total_amount * 0.9,
      status:
        order.status === 'DELIVERED' ? 'SETTLED' :
          order.status === 'CANCELLED' ? 'FAILED' :
            order.status === 'SHIPPED' ? 'PROCESSING' : 'PENDING',
      created_at: formatDate(order.created_at),
      settled_at: order.status === 'DELIVERED' ? formatDate(order.updated_at) : '-',
      transaction_id: order.transaction_id || '' // future use
    }));

    const csvContent = [
      Object.keys(rows[0]).join(','),
      ...rows.map(r => Object.values(r).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'payouts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  const fetchNotifications = async (page = 1, append = false) => {
    try {
      setNotifLoading(true);
      const res = await api.get(`/api/notifications?page=${page}&limit=20`);
      if (res.data.success) {
        const newNotifs = res.data.data.notifications || [];
        setNotifications(prev => append ? [...prev, ...newNotifs] : newNotifs);
        setNotifPage(page);

        // Use pagination metadata if available
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

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      fetchNotifications(1, false);
      toast({ title: 'Success', description: 'All notifications marked as read' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark all as read', variant: 'destructive' });
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

  // Group notifications helper
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && menuItems.some(i => i.id === tab)) {
      setActiveTab(tab);
    }
  }, [window.location.search]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'payouts', label: 'Payouts', icon: IndianRupee },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'store', label: 'Store & Pickup', icon: Settings },
    { id: 'password', label: 'Password', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <Layout>
      <div className="w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              {/* Seller info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  {user?.profile_image_url ? (
                    <img src={user.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h2 className="font-semibold text-foreground text-sm truncate">{user?.name}</h2>
                  <div className="flex flex-col gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] w-fit px-1 py-0 h-4">Verified Seller</Badge>
                    <button
                      onClick={() => navigate('/seller/profile')}
                      className="text-[11px] text-primary hover:underline w-fit flex items-center gap-1"
                    >
                      <User className="h-3 w-3" />
                      Edit Profile
                    </button>
                  </div>
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
                        if (item.path) {
                          navigate(item.path);
                        } else {
                          setActiveTab(item.id);
                          navigate(`/seller?tab=${item.id}`);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${activeTab === item.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-secondary'
                        }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-4 min-w-0">
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Seller Dashboard
                  </h1>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>

                      <Button
                        className="btn-primary"
                        onClick={() => navigate('/seller/products/add')}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Product
                      </Button>

                    </DialogTrigger>
                  </Dialog>
                </div>

                {/* Stats */}
                {loading ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-6">
                          <div className="h-24 bg-muted animate-pulse rounded" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : stats && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-display font-bold">{stats.totalProducts}</h3>
                        <p className="text-sm text-muted-foreground">Total Products</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-display font-bold">{stats.totalOrders}</h3>
                        <p className="text-sm text-muted-foreground">Total Orders</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <IndianRupee className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-display font-bold">{formatPrice(stats.revenue)}</h3>
                        <p className="text-sm text-muted-foreground">Sales Revenue</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-600" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-display font-bold">{formatPrice(stats.pendingPayout)}</h3>
                        <p className="text-sm text-muted-foreground">Pending Payout</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Check className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-display font-bold text-green-600">{formatPrice(stats.settledPayout)}</h3>
                        <p className="text-sm text-muted-foreground">Total Settled</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-display font-bold">{stats.readyToPack}</h3>
                        <p className="text-sm text-muted-foreground">To Pickup</p>
                      </CardContent>
                    </Card>
                  </div>
                )}



                {stats?.lowStockBooks > 0 && (
                  <div className="mb-8 p-4 rounded-lg border flex items-center justify-between 
    bg-accent/10 border-accent/30 text-accent-foreground">

                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-accent" />
                      <div>
                        <p className="font-semibold">Low Stock Alert</p>
                        <p className="text-sm opacity-80">
                          {stats.lowStockBooks} product(s) are running low on stock
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-accent/40 text-accent hover:bg-accent/20"
                      onClick={() => setLowStockOpen(true)}
                    >
                      View
                    </Button>

                  </div>
                )}

                {/* Recent Orders */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Recent Orders
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('orders')}>View All</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium">Order ID</th>
                            <th className="text-left py-3 px-4 font-medium">Customer</th>
                            <th className="text-left py-3 px-4 font-medium">Total</th>
                            <th className="text-left py-3 px-4 font-medium">Status</th>
                            <th className="text-left py-3 px-4 font-medium">AWB</th>
                            <th className="text-left py-3 px-4 font-medium">Date</th>
                            <th className="text-left py-3 px-4 font-medium">View</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                Loading orders...
                              </td>
                            </tr>
                          ) : orders.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                No orders yet
                              </td>
                            </tr>
                          ) : (
                            orders.map((order) => {
                              const shipment = shipments[order.id];
                              return (
                                <tr key={order.id} className="border-b border-border">
                                  <td className="py-3 px-4 font-medium">#{order.id}</td>
                                  <td className="py-3 px-4">{order.user?.name || order.user_name || order.customer_name || 'N/A'}</td>
                                  <td className="py-3 px-4">{formatPrice(order.total_payable_amount || order.total_amount)}</td>
                                  <td className="py-3 px-4">
                                    {renderStatusBadge(order, shipment)}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-xs">
                                    {shipment?.awb_code || '-'}
                                  </td>
                                  <td className="py-3 px-4">
                                    {formatDate(order.created_at)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => navigate(`/seller/orders/${order.id}`)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>

                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Recent Products
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActiveTab('products');
                          navigate('/seller?tab=products');
                        }}
                      >
                        View All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productsLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                        ))}
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No products yet. Add your first product to get started!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Array.isArray(products) && products.slice(0, 3).map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium">{product.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {product.attributes?.author || '-'} • {product.stock || 0} in stock
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-display font-bold">{formatPrice(product.selling_price)}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.is_active ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Dialog open={lowStockOpen} onOpenChange={setLowStockOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Low Stock Products</DialogTitle>
                      <DialogDescription>
                        Products that are about to run out of stock
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                      {lowStockProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No low stock products</p>
                      ) : (
                        lowStockProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex justify-between items-center p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{product.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Stock: {product.stock}
                              </p>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate('/seller?tab=products')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </motion.div>
            )}
            {activeTab === 'products' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SellerProducts />

              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="font-display text-2xl font-bold text-foreground mb-6">
                  My Orders
                </h1>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-4 px-6 font-medium">Order ID</th>
                            <th className="text-left py-4 px-6 font-medium">Customer</th>
                            <th className="text-left py-4 px-6 font-medium">Date</th>
                            <th className="text-left py-4 px-6 font-medium">Total</th>
                            <th className="text-left py-4 px-6 font-medium">Status</th>
                            <th className="text-left py-4 px-6 font-medium">AWB</th>
                            <th className="text-left py-4 px-6 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                No orders found.
                              </td>
                            </tr>
                          ) : (
                            orders.map((order) => {
                              const shipment = shipments[order.id];
                              return (
                                <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                                  <td className="py-4 px-6">#{order.id}</td>
                                  <td className="py-4 px-6">{order.user?.name || 'Guest'}</td>
                                  <td className="py-4 px-6">{formatDate(order.created_at)}</td>
                                  <td className="py-4 px-6">{formatPrice(order.total_amount)}</td>
                                  <td className="py-4 px-6">
                                    {renderStatusBadge(order, shipment)}
                                  </td>
                                  <td className="py-4 px-6 font-mono text-xs">
                                    {shipment?.awb_code || '-'}
                                  </td>
                                  <td className="py-4 px-6">
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/seller/orders/${order.id}`)}>
                                      View Order
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* {activeTab === 'payouts' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                   <h1 className="font-display text-2xl font-bold text-foreground">
                    Payout History
                  </h1>
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                    Owed: {formatPrice(stats?.pendingPayout || 0)}
                  </Badge>
                </div>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
  <div>
    <CardTitle className="text-lg">Recent Settlements</CardTitle>
    <CardDescription>Track your earnings and settlement status per order</CardDescription>
  </div>

  <Button variant="outline" size="sm" onClick={handleExportCSV}>
    Export CSV
  </Button>
</CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-secondary/20">
                            <th className="text-left py-4 px-6 font-medium">Payout ID</th>
                            <th className="text-left py-4 px-6 font-medium">Order</th>
                            <th className="text-left py-4 px-6 font-medium">Amount</th>
                            <th className="text-left py-4 px-6 font-medium">Status</th>
                            <th className="text-left py-4 px-6 font-medium">Created</th>
                            <th className="text-left py-4 px-6 font-medium">Settled At</th>
                            <th className="text-left py-4 px-6 font-medium">Transaction ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2">
                                  <IndianRupee className="h-8 w-8 opacity-20" />
                                  <p>No payout history available yet.</p>
                                  <p className="text-xs">Payouts are generated once orders are successfully paid.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            orders.map((order) => (
                              <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="py-4 px-6 font-mono text-[10px]">PAY-ORD-{order.id}</td>
                                <td className="py-4 px-6 font-medium">#{order.id}</td>
                                <td className="py-4 px-6 font-bold">
                                  {order.status === 'DELIVERED' ? formatPrice(order.total_amount * 0.9) : formatPrice(order.total_amount * 0.9)} 
                                  {order.status !== 'DELIVERED' && <span className="text-[10px] text-muted-foreground font-normal ml-1">(Est.)</span>}
                                </td>
                                <td className="py-4 px-6">
                                  <Badge className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] border",
                                    order.status === 'DELIVERED' ? "bg-green-500/10 text-green-600 border-green-200" : 
                                    order.status === 'CANCELLED' ? "bg-red-500/10 text-red-600 border-red-200" :
                                    order.status === 'SHIPPED' ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                                    "bg-orange-500/10 text-orange-600 border-orange-200"
                                  )}>
                                    {order.status === 'DELIVERED' ? 'SETTLED' : 
                                     order.status === 'CANCELLED' ? 'FAILED' :
                                     order.status === 'SHIPPED' ? 'PROCESSING' : 'PENDING'}
                                  </Badge>
                                </td>
                                <td className="py-4 px-6 text-muted-foreground">{formatDate(order.created_at)}</td>
                                <td className="py-4 px-6 text-muted-foreground">
                                  {order.status === 'DELIVERED' ? formatDate(order.updated_at) : '-'}
                                </td>
                                <td className="py-4 px-6 font-mono text-xs">
  {order.status === 'DELIVERED'
    ? order.transaction_id || 'TXN-' + order.id
    : '-'}
</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
                <div className="mt-4 p-4 border rounded-lg bg-primary/10 border-border flex gap-3 text-xs text-primary">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>Settlements are processed weekly. If you have any discrepancy, please contact support@frappay.shop with the Payout ID.</p>
                </div>
              </motion.div>
            )} */}
            {activeTab === 'payouts' && (
              <SellerPayoutHistory
                payouts={payouts}
                stats={stats}
                formatPrice={formatPrice}
                handleExportCSV={handleExportCSV}
                pagination={payoutsPagination}
                onPageChange={fetchPayouts}
              />
            )}

            {activeTab === 'logistics' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SellerLogistics />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SellerAnalytics />
              </motion.div>
            )}

            {activeTab === 'store' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SellerStoreSettings />
              </motion.div>
            )}

            {activeTab === 'password' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="font-display text-2xl font-bold text-foreground mb-6">
                  Account Password
                </h1>
                <SellerPasswordSettings />
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="font-display text-3xl font-bold text-foreground">Seller Alerts</h1>
                    <p className="text-muted-foreground mt-1">Updates about orders, inventory, and account status.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fetchNotifications(1, false)}
                      className="rounded-xl h-10 px-4"
                      disabled={notifLoading}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", notifLoading && "animate-spin")} />
                      Refresh
                    </Button>
                    {notifications.some(n => !n.is_read) && (
                      <Button
                        onClick={handleMarkAllRead}
                        className="rounded-xl h-10 px-4"
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
                      <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                        <Bell className="h-10 w-10 text-primary/20" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground">Nothing here yet</h3>
                      <p className="text-muted-foreground max-w-xs mt-1">
                        We'll notify you when you get new orders or inventory updates.
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
                                    "group p-6 rounded-2xl border transition-all duration-300 relative",
                                    notif.is_read
                                      ? "bg-card border-border hover:border-primary/20"
                                      : "bg-primary/5 border-primary/20 shadow-sm border-l-4 border-l-primary"
                                  )}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 pr-8">
                                      <div className="flex items-center gap-3 mb-1">
                                        <h4 className="font-bold text-base text-foreground">
                                          {notif.title || "System Notification"}
                                        </h4>
                                        {!notif.is_read && (
                                          <Badge className="h-2 w-2 p-0 rounded-full animate-pulse bg-primary" />
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                        {notif.message}
                                      </p>
                                      {metadata?.redirectUrl && (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          className="p-0 h-auto mt-4 text-primary font-bold hover:no-underline flex items-center gap-1 group/btn"
                                          onClick={() => navigate(metadata.redirectUrl)}
                                        >
                                          {metadata.actionText || 'Process Action'}
                                          <ChevronRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                                        </Button>
                                      )}
                                    </div>

                                    <div className="flex flex-col items-end gap-4 text-xs text-muted-foreground shrink-0">
                                      <span className="flex items-center gap-1.5 opacity-60 bg-secondary/30 px-2 py-1 rounded-lg">
                                         <Clock className="h-3 w-3" />
                                          {formatTime(notif.created_at)} 
                                        </span>
                                      {!notif.is_read && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary"
                                          onClick={() => handleMarkRead(notif.id)}
                                        >
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
                            variant="outline"
                            className="rounded-2xl px-10 h-12 font-bold border-2"
                            onClick={() => fetchNotifications(notifPage + 1, true)}
                            disabled={notifLoading}
                          >
                            {notifLoading ? 'Loading history...' : 'Archive History'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}


          </div>
        </div>
      </div>
    </Layout >
  );
}
