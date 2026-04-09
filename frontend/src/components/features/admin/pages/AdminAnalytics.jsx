import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Clock,
  Store,
  IndianRupee,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowDownUp,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminAnalyticsService } from "@/index";

import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
// ✅ NEW: Dialog import
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AdminAnalytics() {

  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openUsersDialog, setOpenUsersDialog] = useState(false);
  const abortControllerRef = useRef(null);

  const [data, setData] = useState({
    overview: null,
    sales: null,
    sellers: null,
    users: null
  });

  useEffect(() => {
    fetchAnalytics();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [period]);

  const fetchAnalytics = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const [overview, sales, sellers, users] = await Promise.all([
        adminAnalyticsService.getOverview({ period }, abortControllerRef.current.signal),
        adminAnalyticsService.getSalesAnalytics({ period }, abortControllerRef.current.signal),
        adminAnalyticsService.getSellerAnalytics({ period }, abortControllerRef.current.signal),
        adminAnalyticsService.getUserAnalytics({ period, limit: null }, abortControllerRef.current.signal)
      ]);

      setData({
        overview: overview.data,
        sales: sales.data,
        sellers: sellers.data,
        users: users.data
      });
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CanceledError') {
        setError(err.message || 'Failed to fetch analytics');
        console.error('Analytics fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const StatCard = ({ title, value, subtext, icon, valueColor = "text-foreground" }) => {
    const Icon = icon;
    return (
      <Card className="glassmorphism hover:shadow-lg transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl bg-primary/10 flex items-center justify-center`}>
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {subtext && (
              <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                {subtext}
              </span>
            )}
          </div>
          <h3 className={`text-2xl font-bold font-display mb-1 ${valueColor}`}>
            {value}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (

      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Computing ledger metrics...</p>
        </div>
      </div>

    );
  }

  if (error) {
    return (

      <div className="min-h-screen bg-background p-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Analytics Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchAnalytics}>Try Again</Button>
        </div>
      </div>

    );
  }

  const { financials, order_distribution, category_performance } = data.overview || {};

  // Ensure arrays are actually arrays (handle null or undefined)
  const safeSalesTrends = Array.isArray(data.sales?.sales_trends) ? data.sales.sales_trends : [];
  const safeOrderDistribution = Array.isArray(order_distribution) ? order_distribution : [];
  const safeCategoryPerformance = Array.isArray(category_performance) ? category_performance : [];
  const safeTopSellers = Array.isArray(data.sellers?.top_sellers) ? data.sellers.top_sellers : [];

  return (

    <div className="min-h-screen bg-background p-4 sm:p-8 space-y-8">
      {/* Header */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            Admin Command Center
          </h1>
          <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Real-time ledger-based financial intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last quarter</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Core Financials */}
      {data.overview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <StatCard
            title="Total Revenue (GMV)"
            value={formatCurrency(data.overview.total_revenue)}
            subtext="Total Transacted"
            icon={IndianRupee}
          />
          <StatCard
            title="Platform Profit"
            value={formatCurrency(data.overview.total_commission)}
            subtext="Net Ledger Revenue"
            icon={TrendingUp}
            valueColor="text-primary"
          />
          <StatCard
            title="Settleable Payouts"
            value={formatCurrency((data.financials?.payouts?.pending || 0) + (data.financials?.payouts?.processing || 0))}
            subtext={
              <span className="flex gap-1.5 flex-wrap">
                <span className="text-orange-500 font-bold">Pnd: {formatCurrency(data.financials?.payouts?.pending || 0)}</span>
                <span className="text-blue-500 font-bold">Prc: {formatCurrency(data.financials?.payouts?.processing || 0)}</span>
              </span>
            }
            icon={Clock}
            valueColor="text-orange-500"
          />
          <StatCard
            title="Financial Status Check"
            value={data.financials?.payouts?.failed > 0 ? "⚠️ Alert" : "Healthy"}
            subtext={
              <span className="flex gap-1.5 flex-wrap">
                <span className="text-green-600 font-bold">Set: {formatCurrency(data.financials?.payouts?.settled || 0)}</span>
                <span
                  className={`font-bold ${data.financials?.payouts?.failed > 0
                    ? "text-red-600"
                    : "text-muted-foreground"
                    }`}
                >
                  Fail: {formatCurrency(data.financials?.payouts?.failed || 0)}
                </span>
              </span>
            }
            icon={ArrowDownUp}
          />
        </motion.div>
      )}

      {/* Main Charts */}
      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Revenue vs Profit Trend */}
        <Card className="lg:col-span-2 glassmorphism">
          <CardHeader>
            <CardTitle>Financial Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] sm:h-[350px] w-full relative min-h-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <AreaChart data={data.overview?.revenue_trends || []}>
                  <defs>
                    <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00C49F" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00C49F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={formatDate}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(val) => formatCurrency(val)}
                    labelFormatter={(label) => formatDate(label)}
                  />
                  <Area type="monotone" dataKey="revenue" name="GMV" stroke="#8884d8" fillOpacity={1} fill="url(#colorGmv)" />
                  <Area type="monotone" dataKey="commission" name="Net Profit" stroke="#00C49F" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Performance & Order Status */}
        <div className="flex flex-col gap-6">
          <Card className="glassmorphism">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Categories by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data.sales?.category_revenue || []).slice(0, 3).map((cat, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{cat.category}</span>
                    </div>
                    <span className="text-sm font-mono">{formatCurrency(cat.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glassmorphism">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">

                <div className="h-[130px] w-full min-h-0 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%" minHeight={130}>
                    <PieChart>
                      <Pie
                        data={safeOrderDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                      >
                        {safeOrderDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Labels below chart */}
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] w-full">
                  {safeOrderDistribution.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="leading-tight break-words">
                        {entry.status}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Sellers Table */}
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle>Top Performing Sellers (Commission Generators)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-secondary/30 text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 rounded-l-lg">Seller</th>
                  <th className="px-6 py-3">Completed Orders</th>
                  <th className="px-6 py-3">Total Payout</th>
                  <th className="px-6 py-3 rounded-r-lg text-right">Commission Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(data.sellers?.top_performers || []).map((seller, index) => (
                  <tr key={index} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground font-semibold">{seller.business_name || seller.name}</span>
                        <span className="text-xs text-muted-foreground">{seller.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{seller.orders || 0}</td>
                    <td className="px-6 py-4 font-mono">{formatCurrency(seller.revenue)}</td>
                    <td className="px-6 py-4 text-right">
                      <Badge variant="outline" className="font-mono text-primary border bg-primary/10">
                        {formatCurrency(seller.revenue * 0.1)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Sections: Recent Users, Top Sellers, Top Products */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Recent Active Users */}
        {/* <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Active Users</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => window.location.href = ' /admin?tab=users'}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.users?.recent_active_users || []).slice(0, 5).map((user, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                    {user.profile_image_url ? (
                      <img src={user.profile_image_url} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              ))}
              {(!data.users?.recent_active_users?.length) && (
                <p className="text-xs text-muted-foreground">No recent activity.</p>
              )}
            </div>
          </CardContent>
        </Card> */}

        {/* Most Active Users (Repeat Shoppers) */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-sm font-medium">Most Active Users (Repeat Shoppers)</CardTitle>
              <Badge variant="outline" className="w-fit bg-primary/5 text-[10px] text-primary border-primary/20 py-0 h-4">Loyalty</Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary hover:bg-primary/10"
              onClick={() => setOpenUsersDialog(true)}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.users?.top_users || []).slice(0, 5).map((user, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
                    {user.profile_image_url ? (
                      <img src={user.profile_image_url} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      user.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <Badge variant="secondary" className="text-[10px] h-4 bg-primary/10 text-primary">{user.order_count} Orders</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{formatCurrency(user.total_spent)} Total Spend</p>
                  </div>
                </div>
              ))}
              {(!data.users?.top_users?.length) && (
                <p className="text-xs text-muted-foreground">No repeat shoppers found.</p>
              )}
            </div>
          </CardContent>
        </Card>
        {/* ✅ NEW: Most Active Users Dialog */}
<Dialog open={openUsersDialog} onOpenChange={setOpenUsersDialog}>
  <DialogContent className="max-w-md sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Most Active Users</DialogTitle>
    </DialogHeader>

    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {(data.users?.top_users || []).map((user, i) => (
        <div key={i} className="flex items-center gap-3">
          
          {/* Avatar */}
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary overflow-hidden">
            {user.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              user.name?.charAt(0).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <Badge
                variant="secondary"
                className="text-[10px] h-4 bg-primary/10 text-primary"
              >
                {user.order_count} Orders
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {formatCurrency(user.total_spent)} Total Spend
            </p>
          </div>

        </div>
      ))}

      {(!data.users?.top_users?.length) && (
        <p className="text-xs text-muted-foreground text-center">
          No repeat shoppers found.
        </p>
      )}
    </div>
  </DialogContent>
</Dialog>

        {/* Top Sellers (Summary) */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Sellers</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => window.location.href = '/admin?tab=sellers'}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.sellers?.top_performers || []).slice(0, 5).map((seller, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{seller.business_name || seller.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(seller.revenue)} Sales</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Selling Products</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => window.location.href = '/admin?tab=inventory'}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(data.sales?.top_products || []).slice(0, 5).map((product, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{product.title}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} sold</p>
                  </div>
                  <div className="text-sm font-mono font-medium">{formatCurrency(product.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance & Ledger Exploration */}
      {/* <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">Financial Ledger</CardTitle>
              <CardDescription>Direct view into the atomic transaction stream</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Audit Ready</Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white/50"
                onClick={() => window.location.href = '/api/finance/admin/ledger'}
              >
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/10 text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Entity</th>
                    <th className="pb-3 pr-4 font-medium">Reference</th>
                    <th className="pb-3 pr-4 font-medium">Amount</th>
                    <th className="pb-3 pr-4 font-medium">Direction</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Dated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(data.financials?.recent_ledger || []).length > 0 ? (
                    data.financials.recent_ledger.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition-colors group">
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 text-[10px] uppercase font-bold px-1.5 py-0">
                            {entry.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {entry.entity_name || (entry.seller_id ? 'Seller' : entry.user_id ? 'User' : 'Platform')}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase">
                              {entry.entity_role || 'System'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground font-mono text-[11px]">
                          {entry.order_id ? `ORD-${entry.order_id}` : entry.reference_id || 'System'}
                        </td>
                        <td className="py-3 pr-4 font-bold font-display">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                            entry.direction === 'credit' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                          )}>
                            {entry.direction}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn(
                            "flex items-center gap-1.5 text-xs capitalize whitespace-nowrap",
                            entry.status === 'settled' ? "text-green-600" :
                              entry.status === 'processing' ? "text-blue-500" :
                                entry.status === 'failed' ? "text-red-500 font-bold" :
                                  "text-orange-500"
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              entry.status === 'settled' ? "bg-green-600" :
                                entry.status === 'processing' ? "bg-blue-500" :
                                  entry.status === 'failed' ? "bg-red-500" :
                                    "bg-orange-500"
                            )} />
                            {entry.status}
                            {entry.status === 'failed' && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded ml-1 tracking-tighter">ACTION</span>}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                        No auditable records in ledger for selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div> */}

      {/* Refund Analytics Snapshot */}
      {/* <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glassmorphism">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center gap-2">
              <History className="h-4 w-4" /> Refund Payout Oversight
            </CardTitle>
            <CardDescription>Consolidated view of customer refund flows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Approved Refunds</p>
                <p className="text-xl font-bold font-display">{formatCurrency(data.financials?.refunds || 0)}</p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Refund Rate (Volume)</p>
                <p className="text-xl font-bold font-display">{data.financials?.refund_rate || 0}%</p>
              </div>
              <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-1">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Net Liquidity after Refunds</p>
                <p className="text-xl font-bold font-display">{formatCurrency((data.overview?.total_revenue || 0) - (data.financials?.refunds || 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div> */}
    </div>

  );
}