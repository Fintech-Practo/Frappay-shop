import { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Users,
  Store,
  Package,
  IndianRupee,
  ShoppingCart,
  TrendingUp,
  Settings,
  Shield,
  BarChart3,
  CheckCircle,
  XCircle,
  Tag,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  Truck,
  RotateCcw,
  Coins,
  ChevronDown,
  CreditCard,
  Bell,
  Clock,
  Check,
  RefreshCw,
  ArrowRight
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

import {
  Layout, adminService,
  AdminAccountSettings, InventoryList, UserTable, SupportRequestManager,
  AuditLogViewer, ReviewModeration, SellerTable, OrderTable, InventoryLowStock, CommissionManager,
  AdminReturns, AdminLogistics, AdminAbandonedCarts, CouponManager, RewardCoinManager, AdminOrderLedger, AdminSellerPayoutLedger, AdminRefundLedger
} from '@/index.js';
import SellerOnboardingDetailsModal from '../components/SellerOnboardingDetailsModal';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [openSection, setOpenSection] = useState(null);
  const [timeRange, setTimeRange] = useState('6m');
  const [stats, setStats] = useState({
    users: { total_users: 0, total_sellers: 0, new_users_today: 0 },
    orders: { total_orders: 0, total_revenue: 0 },
    charts: { user_growth: [], revenue_series: [] }
  });
  const [pendingOnboarding, setPendingOnboarding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [notifPage, setNotifPage] = useState(1);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');

    // ✅ Handle sub-routes FIRST
    if (location.pathname === '/admin/analytics') {
      setActiveTab('analytics');
      return;
    }

    if (location.pathname === '/admin/site-settings') {
      setActiveTab('site-settings');
      return;
    }

    // ✅ Handle main /admin tabs
    if (location.pathname === '/admin') {
      if (tab && menuItems.some(i => i.id === tab)) {
        setActiveTab(tab);
      } else {
        setActiveTab('overview');
      }
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchAdminNotifications(1, false);
    }
  }, [activeTab]);

  const fetchAdminNotifications = async (page = 1, append = false) => {
    try {
      setNotifLoading(true);
      const res = await adminService.getNotifications(page, 20);
      if (res.success) {
        const newNotifs = res.data.notifications || [];
        setNotifications(prev => append ? [...prev, ...newNotifs] : newNotifs);
        setNotifPage(page);
        
        if (res.data.pagination) {
          setNotifHasMore(res.data.pagination.hasMore);
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
      await adminService.markAllNotificationsRead();
      fetchAdminNotifications(1, false);
      toast({ title: 'Success', description: 'All notifications marked as read' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark all as read', variant: 'destructive' });
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await adminService.markNotificationRead(id);
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

  async function loadDashboardData() {
    try {
      const statsData = await adminService.getDashboardStats(timeRange);
      const onboardingData = await adminService.getPendingOnboarding();

      // Merge with defaults to prevent crash if backend returns partial/null data
      setStats(prev => ({
        users: { ...prev.users, ...(statsData?.users || {}) },
        orders: { ...prev.orders, ...(statsData?.orders || {}) },
        charts: statsData?.charts || { user_growth: [], revenue_series: [] }
      }));

      // Fixed: extract pendingRequests from the paginated response
      const pendingItems = onboardingData?.pendingRequests || onboardingData?.data || onboardingData || [];
      setPendingOnboarding(Array.isArray(pendingItems) ? pendingItems : []);
    } catch (err) {
      console.error("Failed to load admin dashboard data", err);
      // Keep defaults
    } finally {
      setLoading(false);
    }
  }

  async function handleViewSellerDetails(userId) {
    setSelectedSellerId(userId);
    setIsModalOpen(true);
  }

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, route: '/admin/analytics' },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'sellers', label: 'Sellers', icon: Store },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'ledger', label: 'Order Ledger', icon: IndianRupee },
    { id: 'payouts', label: 'Seller Payouts', icon: Coins },
    { id: 'refund-payouts', label: 'Refund Payouts', icon: CreditCard },
    { id: 'abandoned-carts', label: 'Abandoned Carts', icon: ShoppingCart },
    { id: 'returns', label: 'Returns', icon: RotateCcw },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'reviews', label: 'Reviews', icon: MessageCircle },
    { id: 'support', label: 'Support', icon: MessageCircle },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'reward-coins', label: 'Reward Coins', icon: Coins },
    { id: 'commission', label: 'Fees & Margins', icon: Tag },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'site-settings', label: 'Site Assets', icon: ImageIcon, route: '/admin/site-settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: User },
  ];

  const statCards = [
    { title: 'Total Users', value: stats.users?.total_users || 0, icon: Users, change: `+${stats.users?.new_users_today || 0} today` },
    { title: 'Total Sellers', value: stats.users?.total_sellers || 0, icon: Store, change: 'Active' },
    { title: 'Total Orders', value: stats.orders?.total_orders || 0, icon: ShoppingCart, change: `${stats.orders?.pending_orders || 0} pending` },
    { title: 'Revenue', value: `₹${stats.orders?.total_revenue || 0}`, icon: IndianRupee, change: 'Total Gross' },
  ];




  return (
    <Layout>
      <div className="w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24 flex flex-col max-h-[calc(100vh-190px)] overflow-hidden">
              {/* Admin info */}
              <div className="p-6 flex items-center gap-4 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">{user?.name}</h2>
                  <Badge className="bg-destructive text-destructive-foreground text-xs mt-1">
                    Admin
                  </Badge>
                </div>
              </div>

              {/* Menu */}
              <nav className="overflow-y-auto p-4 flex-1 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[hsl(var(--border))] hover:[&::-webkit-scrollbar-thumb]:bg-[hsl(var(--muted-foreground))] [&::-webkit-scrollbar-thumb]:rounded-full">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.route) {
                          navigate(item.route);
                        } else {
                          navigate(`/admin?tab=${item.id}`);
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
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <div className="w-full min-w-0">
            <Outlet />
            {location.pathname === "/admin" && (
              <>
                {activeTab === 'overview' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h1 className="font-display text-2xl font-bold text-foreground mb-6">
                      Dashboard Overview
                    </h1>

                    {/* Stats */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      {statCards.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                          <Card key={index}>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <Badge variant="secondary" className="text-xs text-success">
                                  {stat.change}
                                </Badge>
                              </div>
                              <h3 className="text-2xl font-display font-bold">{stat.value}</h3>
                              <p className="text-sm text-muted-foreground">{stat.title}</p>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Analytics */}
                    {/* <AdminAnalytics
                  stats={stats}
                  timeRange={timeRange}
                  onRangeChange={setTimeRange}
                /> */}

                    <div className="grid lg:grid-cols-2 gap-8">
                      {/* Pending KYC */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-warning" />
                              Pending Seller KYC
                            </span>
                            <Badge variant="secondary">{pendingOnboarding.length}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {pendingOnboarding.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No pending applications.</p>
                            ) : (
                              pendingOnboarding.map((req) => (
                                <div
                                  key={req.id}
                                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                                >
                                  <div>
                                    <h4 className="font-medium text-sm">{req.business_name || 'N/A'}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <p className="text-xs text-muted-foreground">User ID: {req.user_id}</p>
                                      {req.requested_commission_rate != null && (
                                        <Badge variant="outline" className="h-4 text-[10px] px-1 bg-primary/5 text-primary border-primary/20">
                                          {req.requested_commission_rate}% Request
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 px-3"
                                      onClick={() => handleViewSellerDetails(req.user_id)}
                                    >
                                      View Details
                                    </Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin?tab=users')}>
                              <Users className="h-5 w-5" />
                              <span>Manage Users</span>
                            </Button>
                            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin?tab=support')}>
                              <MessageCircle className="h-5 w-5" />
                              <span>Supports</span>
                            </Button>
                            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin?tab=reviews')}>
                              <CheckCircle className="h-5 w-5" />
                              <span>Review Moderation</span>
                            </Button>
                            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate('/admin?tab=inventory')}>
                              <Package className="h-5 w-5" />
                              <span>Check Inventory</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'users' && <UserTable />}

                {activeTab === 'sellers' && <SellerTable />}

                {activeTab === 'orders' && <OrderTable />}

                {activeTab === 'abandoned-carts' && <AdminAbandonedCarts />}
                {activeTab === 'ledger' && <AdminOrderLedger />}
                {activeTab === 'payouts' && <AdminSellerPayoutLedger />}
                {activeTab === 'refund-payouts' && <AdminRefundLedger />}

                {activeTab === 'returns' && <AdminReturns />}

                {activeTab === 'logistics' && <AdminLogistics />}

                {activeTab === 'inventory' && (
                  <div className="space-y-8">
                    <InventoryLowStock />
                    <InventoryList />
                  </div>
                )}

                {activeTab === 'reviews' && <ReviewModeration />}

                {activeTab === 'support' && <SupportRequestManager />}
                {activeTab === 'coupons' && <CouponManager />}
                {activeTab === 'reward-coins' && <RewardCoinManager />}

                {activeTab === 'commission' && <CommissionManager />}

                {activeTab === 'audit' && <AuditLogViewer />}

                {activeTab === 'notifications' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h1 className="font-display text-2xl font-bold text-foreground">
                        System Notifications
                      </h1>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => fetchAdminNotifications(1, false)}
                          disabled={notifLoading}
                        >
                          <RefreshCw className={cn("h-4 w-4 mr-2", notifLoading && "animate-spin")} />
                          Refresh
                        </Button>
                        {notifications.some(n => !n.is_read) && (
                          <Button onClick={handleMarkAllRead}>
                            <Check className="h-4 w-4 mr-2" />
                            Mark All as Read
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      {notifications.length === 0 ? (
                        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                          <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="h-8 w-8 text-primary/30" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground">All caught up!</h3>
                          <p className="text-muted-foreground max-w-xs mx-auto mt-1">
                            You'll see system alerts and order updates here as they arrive.
                          </p>
                        </div>
                      ) : (
                        <>
                          {Object.entries(groupedNotifications()).map(([groupName, groupNotifs]) => {
                            if (groupNotifs.length === 0) return null;
                            return (
                              <div key={groupName} className="space-y-4">
                                <div className="flex items-center gap-4">
                                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 shrink-0">
                                    {groupName}
                                  </h3>
                                  <div className="h-px bg-border flex-1" />
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
                                        "group p-5 rounded-2xl border transition-all duration-300 relative",
                                        notif.is_read 
                                          ? "bg-card border-border hover:border-primary/30" 
                                          : "bg-primary/5 border-primary/20 shadow-sm border-l-4 border-l-primary"
                                      )}
                                    >
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1 pr-6">
                                          <div className="flex items-center gap-3 mb-1">
                                            <p className="font-bold text-sm text-foreground">
                                              {notif.title || "Alert"}
                                            </p>
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
                                              className="p-0 h-auto mt-3 text-primary font-bold hover:no-underline flex items-center gap-1 group/btn"
                                              onClick={() => navigate(metadata.redirectUrl)}
                                            >
                                              {metadata.actionText || 'View Details'}
                                              <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                                            </Button>
                                          )}
                                        </div>

                                        <div className="flex flex-col items-end gap-3 text-xs text-muted-foreground shrink-0">
                                          <span className="flex items-center gap-1.5 opacity-60">
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
                                              className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" 
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
                                className="rounded-xl px-8 border-2 font-bold"
                                onClick={() => fetchAdminNotifications(notifPage + 1, true)}
                                disabled={notifLoading}
                              >
                                {notifLoading ? 'Loading...' : 'Archive History'}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'settings' && <AdminAccountSettings />}
              </>
            )}
          </div>
        </div>

        {/* Seller Onboarding Details Modal */}
        <SellerOnboardingDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSellerId(null);
          }}
          userId={selectedSellerId}
          onApprove={async (userId, commissionRate) => {
            try {
              await adminService.approveOnboarding(userId, commissionRate);
              // Refresh the pending onboarding list
              loadDashboardData();
              setIsModalOpen(false);
              setSelectedSellerId(null);
            } catch (error) {
              console.error('Failed to approve onboarding:', error);
              alert('Failed to approve application. Please try again.');
            }
          }}
          onReject={async (userId, reason) => {
            try {
              await adminService.rejectOnboarding(userId, reason);
              // Refresh the pending onboarding list
              loadDashboardData();
              setIsModalOpen(false);
              setSelectedSellerId(null);
            } catch (error) {
              console.error('Failed to reject onboarding:', error);
              alert('Failed to reject application. Please try again.');
            }
          }}
        />
      </div>
    </Layout>
  );
}