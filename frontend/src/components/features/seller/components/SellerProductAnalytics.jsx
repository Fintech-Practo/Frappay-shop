import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
    ArrowLeft,
    TrendingUp,
    Users,
    ShoppingCart,
    IndianRupee,
    Package,
    Calendar,
    AlertTriangle,
    RefreshCcw
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Layout } from '@/index.js';


export default function SellerProductAnalytics() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        fetchProductAnalytics();
    }, [productId, period]);

    const fetchProductAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/analytics/product/${productId}`, {
                params: { period }
            });
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to load product analytics",
                variant: "destructive"
            });
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

    if (loading) return (
        <Layout>
            <div className="h-[80vh] flex items-center justify-center flex-col gap-4">
                <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing product performance...</p>
            </div>
        </Layout>
    );

    if (!data) return (
        <Layout>
            <div className="h-[80vh] flex items-center justify-center flex-col gap-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <p className="text-lg font-medium">Product not found or access denied.</p>
                <Button onClick={() => navigate('/seller/products')}>Return to Inventory</Button>
            </div>
        </Layout>
    );

    const { product_info, sales_summary, sales_trend, recent_orders } = data;

    return (
        <Layout>
            <div className="container-custom max-w-7xl mx-auto py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 border-b pb-6">
                    <Button variant="ghost" className="w-fit pl-0" onClick={() => navigate('/seller?tab=products')}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Products
                    </Button>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="h-24 w-24 rounded-lg bg-secondary border overflow-hidden shrink-0">
                            {product_info.image_url ? (
                                <img src={product_info.image_url} alt={product_info.title} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No Img</div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{product_info.product_type_label || 'Product'}</Badge>
                                <span className="text-xs text-muted-foreground font-mono">SKU: {product_info.sku || 'N/A'}</span>
                            </div>
                            <h1 className="text-2xl font-bold font-display text-foreground">{product_info.title}</h1>
                            <p className="text-muted-foreground mt-1">
                                Current Price: <span className="font-semibold text-foreground">{formatCurrency(product_info.selling_price)}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Total Units Sold</span>
                                <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-2xl font-bold">{sales_summary.total_units_sold}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Gross Revenue</span>
                                <IndianRupee className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-2xl font-bold">{formatCurrency(sales_summary.gross_revenue)}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary text-primary-foreground border-none">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-primary-foreground/80">Net Earnings</span>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-2xl font-bold">{formatCurrency(sales_summary.net_earnings)}</div>
                            <p className="text-xs text-primary-foreground/70 mt-1">Your payout</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Conversion Rate</span>
                                <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-2xl font-bold">{sales_summary.conversion_rate || 'N/A'}%</div>
                            <p className="text-xs text-muted-foreground mt-1">View-to-sale (Approx)</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Sales Trend Chart */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Sales Performance</CardTitle>
                            <CardDescription>Daily units sold over the last {period}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <AreaChart data={sales_trend}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
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
                                        <YAxis allowDecimals={false} fontSize={12} />
                                        <Tooltip labelFormatter={formatDate} />
                                        <Area
                                            type="monotone"
                                            dataKey="units"
                                            stroke="#22c55e"
                                            fillOpacity={1}
                                            fill="url(#colorSales)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stock Status Side Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Stock Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-6 border rounded-lg bg-secondary/20">
                                <span className="text-4xl font-bold">{product_info.stock}</span>
                                <span className="text-sm text-muted-foreground mt-1">Available Units</span>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold">Inventory Health</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant={product_info.stock > 0 ? 'default' : 'destructive'}>
                                            {product_info.stock > 0 ? 'Active Listing' : 'Out of Stock'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Last Restock</span>
                                        <span>Just now</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Who Bought This Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Customers</CardTitle>
                        <CardDescription>Who bought this item recently</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Order Date</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Total Paid</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recent_orders?.length > 0 ? (
                                    recent_orders.map((order) => (
                                        <TableRow key={order.order_id}>
                                            <TableCell>
                                                <div className="font-medium">{order.customer_name}</div>
                                                <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                                            </TableCell>
                                            <TableCell>{formatDate(order.created_at)}</TableCell>
                                            <TableCell>x{order.quantity}</TableCell>
                                            <TableCell>{formatCurrency(order.total_price)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => navigate(`/seller/orders/${order.order_id}`)}>
                                                    View Order
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No sales recorded for this product yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
