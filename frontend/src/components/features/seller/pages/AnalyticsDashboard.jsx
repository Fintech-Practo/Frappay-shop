import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    Users,
    Package,
    IndianRupee,
    ShoppingCart,
    BarChart3,
    Download,
    AlertTriangle,
    CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from 'recharts';
import { analyticsService } from '@/index.js';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sales');
    const [period, setPeriod] = useState('30d');
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState(null);

    const tabs = [
        { id: 'sales', label: 'Sales Analytics', icon: BarChart3 },
        { id: 'customers', label: 'Customer Insights', icon: Users },
        { id: 'inventory', label: 'Inventory Reports', icon: Package },
        { id: 'financial', label: 'Financial Reports', icon: IndianRupee },
    ];

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await analyticsService.getDashboardOverview({ period });
            if (response.success) {
                setAnalytics(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(price || 0);
    };

    const formatNumber = (num) => {
        return new Intl.NumberFormat('en-IN').format(num || 0);
    };

    const renderSalesAnalytics = () => {
        if (!analytics?.sales_analytics) return null;

        const { sales_trends, top_books, category_revenue } = analytics.sales_analytics;

        return (
            <div className="space-y-6">
                {/* Sales Trends Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Sales Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <LineChart data={sales_trends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value, name) => [
                                            name === 'revenue' ? formatPrice(value) : formatNumber(value),
                                            name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Items Sold'
                                        ]}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                                    <Line type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Selling Books */}
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Selling Books</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {top_books?.slice(0, 5).map((book, index) => (
                                    <div key={book.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                                                <h4 className="font-medium text-sm">{book.title}</h4>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{book.author}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{formatNumber(book.total_sold)}</p>
                                            <p className="text-xs text-muted-foreground">sold</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Category Revenue */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Revenue by Category</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <RePieChart>
                                        <Pie
                                            data={category_revenue}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="revenue"
                                        >
                                            {category_revenue?.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatPrice(value)} />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    };

    const renderCustomerInsights = () => {
        if (!analytics?.customer_insights) return null;

        const { demographics, geographic_distribution, repeat_customer_analysis } = analytics.customer_insights;

        return (
            <div className="space-y-6">
                {/* Customer Demographics */}
                <div className="grid md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatNumber(demographics?.total_customers)}</p>
                                    <p className="text-sm text-muted-foreground">Total Customers</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatNumber(demographics?.new_customers)}</p>
                                    <p className="text-sm text-muted-foreground">New Customers</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-purple-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatNumber(demographics?.repeat_customers)}</p>
                                    <p className="text-sm text-muted-foreground">Repeat Customers</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <IndianRupee className="h-5 w-5 text-orange-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatPrice(demographics?.avg_customer_value)}</p>
                                    <p className="text-sm text-muted-foreground">Avg Customer Value</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Geographic Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Geographic Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {geographic_distribution?.slice(0, 10).map((location, index) => (
                                <div key={location.location} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline">{index + 1}</Badge>
                                        <span className="font-medium">{location.location}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{formatPrice(location.revenue)}</p>
                                        <p className="text-sm text-muted-foreground">{location.customers} customers</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Repeat Customer Analysis */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Loyalty Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                            {repeat_customer_analysis?.map((segment) => (
                                <div key={segment.customer_type} className="p-4 border rounded-lg">
                                    <h4 className="font-semibold mb-2">{segment.customer_type}</h4>
                                    <p className="text-2xl font-bold text-primary">{formatNumber(segment.count)}</p>
                                    <p className="text-sm text-muted-foreground">customers</p>
                                    <p className="text-lg font-bold mt-2">{formatPrice(segment.avg_order_value)}</p>
                                    <p className="text-xs text-muted-foreground">avg order value</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderInventoryReports = () => {
        if (!analytics?.inventory_reports) return null;

        const { stock_movement, low_stock_predictions, seasonal_trends } = analytics.inventory_reports;

        return (
            <div className="space-y-6">
                {/* Low Stock Alerts */}
                {low_stock_predictions?.filter(item => item.stock_level === 'Critical' || item.stock_level === 'Low').length > 0 && (
                    <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-800">
                                <AlertTriangle className="h-5 w-5" />
                                Low Stock Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {low_stock_predictions?.filter(item => item.stock_level === 'Critical' || item.stock_level === 'Low').map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                        <div>
                                            <h4 className="font-medium">{item.title}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {item.stock} in stock • {item.months_of_stock} months left
                                            </p>
                                        </div>
                                        <Badge variant={item.stock_level === 'Critical' ? 'destructive' : 'secondary'}>
                                            {item.stock_level}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stock Movement */}
                <Card>
                    <CardHeader>
                        <CardTitle>Stock Movement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">Product</th>
                                        <th className="text-left py-3 px-4">Current Stock</th>
                                        <th className="text-left py-3 px-4">Total Sold</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stock_movement?.slice(0, 10).map((item) => (
                                        <tr key={item.id} className="border-b">
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-medium">{item.title}</p>
                                                    <p className="text-xs text-muted-foreground">{item.author}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={item.current_stock < 10 ? 'text-red-500 font-medium' : ''}>
                                                    {item.current_stock}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">{formatNumber(item.total_sold)}</td>
                                            <td className="py-3 px-4">
                                                <Badge variant={
                                                    item.stock_status === 'Out of Stock' ? 'destructive' :
                                                        item.stock_status === 'Low Stock' ? 'secondary' : 'default'
                                                }>
                                                    {item.stock_status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderFinancialReports = () => {
        if (!analytics?.financial_reports) return null;

        const { profit_loss, commission_breakdown, tax_summary } = analytics.financial_reports;

        return (
            <div className="space-y-6">
                {/* Financial Summary */}
                <div className="grid md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <IndianRupee className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatPrice(profit_loss?.gross_revenue)}</p>
                                    <p className="text-sm text-muted-foreground">Gross Revenue</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-red-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatPrice(profit_loss?.total_commission)}</p>
                                    <p className="text-sm text-muted-foreground">Commission</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatPrice(profit_loss?.net_revenue)}</p>
                                    <p className="text-sm text-muted-foreground">Net Revenue</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-purple-500" />
                                <div>
                                    <p className="text-2xl font-bold">{formatNumber(profit_loss?.total_orders)}</p>
                                    <p className="text-sm text-muted-foreground">Total Orders</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Commission Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Commission Breakdown by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">Category</th>
                                        <th className="text-left py-3 px-4">Orders</th>
                                        <th className="text-left py-3 px-4">Revenue</th>
                                        <th className="text-left py-3 px-4">Commission</th>
                                        <th className="text-left py-3 px-4">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {commission_breakdown?.map((item) => (
                                        <tr key={item.category} className="border-b">
                                            <td className="py-3 px-4 font-medium">{item.category}</td>
                                            <td className="py-3 px-4">{formatNumber(item.orders)}</td>
                                            <td className="py-3 px-4">{formatPrice(item.revenue)}</td>
                                            <td className="py-3 px-4">{formatPrice(item.commission)}</td>
                                            <td className="py-3 px-4">
                                                <Badge variant="outline">{item.commission_rate}%</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Tax Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tax Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold mb-2">Taxable Revenue</h4>
                                <p className="text-2xl font-bold text-green-600">{formatPrice(tax_summary?.taxable_revenue)}</p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold mb-2">Estimated Tax (18%)</h4>
                                <p className="text-2xl font-bold text-red-600">{formatPrice(tax_summary?.estimated_tax)}</p>
                            </div>
                            <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold mb-2">Net After Tax</h4>
                                <p className="text-2xl font-bold text-blue-600">{formatPrice(tax_summary?.net_after_tax)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error}</p>
                <Button onClick={fetchAnalytics} className="mt-4">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
                <div className="flex items-center gap-4">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="1y">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {activeTab === 'sales' && renderSalesAnalytics()}
                {activeTab === 'customers' && renderCustomerInsights()}
                {activeTab === 'inventory' && renderInventoryReports()}
                {activeTab === 'financial' && renderFinancialReports()}
            </motion.div>
        </div>
    );
}
