import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import {
    useNavigate
} from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
    TrendingUp,
    Package,
    IndianRupee,
    ShoppingCart,
    BarChart3,
    AlertTriangle,
    ArrowLeft,
    Wallet
} from 'lucide-react';
import api from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SellerAnalytics() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState(null);


    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch overview which now uses new backend logic
            const response = await api.get('/api/analytics/overview', {
                params: { period }
            });

            if (response.data.success) {
                setAnalytics(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to load analytics');
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-lg font-medium text-destructive mb-4">{error}</p>
                <Button onClick={fetchAnalytics}>Try Again</Button>
            </div>
        );
    }

    const { sales_analytics, financial_reports, inventory_reports } = analytics || {};
    const { summary } = financial_reports || {};
    const { sales_trends, top_products, category_performance = [] } = sales_analytics || {};

    return (
        <div className="space-y-8 pb-12 overflow-x-hidden">
            {/* Header */}
            <div className="border-b pb-6 space-y-4">
                <div className="flex  flex-col md:flex-row md:items-center gap-4 w-full">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold font-display w-full">
                            Business Intelligence
                        </h1>
                        <p className="text-muted-foreground">
                            Your real-time financial performance
                        </p>
                    </div>

                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-full md:w-[145px] h-10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 3 months</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Key Financial Metrics */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary text-primary-foreground border-none shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-background/20 rounded-lg">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary" className="bg-background/20 text-primary-foreground border-none">Net Earnings</Badge>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{formatCurrency(summary?.net_earnings)}</h3>
                        <p className="text-primary-foreground/80 text-sm">After commissions & fees</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <IndianRupee className="h-6 w-6" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold mb-1 text-foreground">{formatCurrency(summary?.gross_sales)}</h3>
                        <p className="text-muted-foreground text-sm">Gross Sales</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <ShoppingCart className="h-6 w-6" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold mb-1 text-foreground">{summary?.total_orders}</h3>
                        <p className="text-muted-foreground text-sm">Completed Orders</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold mb-1 text-foreground">{formatCurrency(summary?.aov)}</h3>
                        <p className="text-muted-foreground text-sm">Avg Order Value</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Earnings Trend Chart */}
                <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle>Net Earnings Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full min-h-[350px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <AreaChart data={sales_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={formatDate}
                                        fontSize={12}
                                    />
                                    <YAxis
                                        tickFormatter={(val) => `₹${val}`}
                                        fontSize={12}
                                    />
                                    <Tooltip
                                        formatter={(val) => formatCurrency(val)}
                                        labelFormatter={formatDate}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="net_earnings"
                                        name="Net Earnings"
                                        stroke="#22c55e"
                                        fillOpacity={1}
                                        fill="url(#colorEarnings)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sales by Category</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <div className="h-[350px] w-full max-w-[350px] min-h-[350px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={Array.isArray(category_performance) ? category_performance.map(item => ({ ...item, earnings: Number(item.earnings), })) : []} dataKey="earnings"
                                        nameKey="category_name"
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                    >
                                        {category_performance?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(value)} />
                                    <Legend verticalAlign="bottom" align="center" layout="horizontal" wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products & Dead Stock */}
            <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Top Performing Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {top_products?.map((product, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0 text-[10px]">{index + 1}</Badge>
                                            <h4 className="font-medium truncate">{product.title}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant={product.inventory_status === 'In Stock' ? 'success' : 'destructive'} className="text-[10px] px-1 py-0 h-4">
                                                {product.inventory_status}
                                            </Badge>
                                            <span>Stock: {product.current_stock}</span>
                                        </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap">
                                        <p className="font-bold text-primary">{formatCurrency(product.earnings)}</p>
                                        <p className="text-xs text-muted-foreground">{product.units_sold} units sold</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Dead Stock Alert */}
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Dead Stock Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">Products with stock but 0 sales in last 90 days.</p>
                        <div className="space-y-3">
                            {inventory_reports?.dead_stock?.length > 0 ? (
                                inventory_reports.dead_stock.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                                        <div className="truncate flex-1 mr-4">
                                            <h4 className="font-medium text-sm truncate">{item.title}</h4>
                                            <p className="text-xs text-muted-foreground">Price: {formatCurrency(item.price)}</p>
                                        </div>
                                        <Badge variant="secondary">Qty: {item.stock}</Badge>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p>No dead stock detected! Great job.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}