import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import adminService from '../services/admin.service';
import { formatDate } from '@/lib/utils';

/* ─── Risk-level badge colour map ───────────────────────────────────────────── */
const RISK_CONFIG = {
    HIGH: {
        label: 'HIGH',
        className: 'bg-red-100 text-red-800 border border-red-200',
    },
    MEDIUM: {
        label: 'MEDIUM',
        className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    },
    LOW: {
        label: 'LOW',
        className: 'bg-green-100 text-green-800 border border-green-200',
    },
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
    }).format(amount ?? 0);
}


/* ─── Component ──────────────────────────────────────────────────────────────── */
export default function AdminAbandonedCarts() {
    // ── State ──────────────────────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [days, setDays] = useState(30);
    const [daysInput, setDaysInput] = useState('30');

    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 20,
        total_pages: 1,
    });

    // ── Data fetcher ───────────────────────────────────────────────────────────
    const loadData = useCallback(async (currentPage, currentDays) => {
        try {
            setLoading(true);
            setError(null);
            const res = await adminService.getAbandonedCarts({
                days: currentDays,
                page: currentPage,
                limit,
            });

            if (res.success && res.data) {
                setItems(res.data.items || []);
                setPagination(res.data.pagination || {
                    total: 0, page: 1, limit, total_pages: 1,
                });
            } else {
                setItems([]);
                setError('Unexpected response from server.');
            }
        } catch (err) {
            console.error('AdminAbandonedCarts fetch error:', err);
            setError(err?.response?.data?.message || err.message || 'Failed to load abandoned carts.');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    // Initial load + when page / days change
    useEffect(() => {
        loadData(page, days);
    }, [page, days, loadData]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    function handleApplyFilter() {
        const parsed = parseInt(daysInput, 10);
        if (isNaN(parsed) || parsed < 1) return;
        setDays(parsed);
        setPage(1);
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') handleApplyFilter();
    }

    function handlePrevPage() {
        if (page > 1) setPage(p => p - 1);
    }

    function handleNextPage() {
        if (page < pagination.total_pages) setPage(p => p + 1);
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Abandoned Cart Monitor</h2>
                        <p className="text-sm text-muted-foreground">
                            {pagination.total} item{pagination.total !== 1 ? 's' : ''} in cart for ≥{days} day{days !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Days filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">Min days in cart</label>
                    <Input
                        type="number"
                        min={1}
                        value={daysInput}
                        onChange={e => setDaysInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-24"
                    />
                    <Button size="sm" onClick={handleApplyFilter}>
                        Apply
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadData(page, days)}
                        title="Refresh"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Table card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                        <span>Cart Items</span>
                        {loading && (
                            <span className="text-sm font-normal text-muted-foreground animate-pulse">
                                Loading…
                            </span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Added On</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead className="text-center">Orders</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-center">Stock</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading && items.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="text-center py-12 text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <RefreshCw className="h-5 w-5 animate-spin" />
                                                Fetching abandoned carts…
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : error ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="text-center py-12"
                                        >
                                            <div className="flex flex-col items-center gap-2 text-destructive">
                                                <AlertTriangle className="h-5 w-5" />
                                                <span>{error}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : items.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="text-center py-12 text-muted-foreground"
                                        >
                                            No abandoned cart items found for the current filter.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    items.map(item => {
                                        const riskCfg = RISK_CONFIG[item.risk_level] ?? RISK_CONFIG.LOW;
                                        return (
                                            <TableRow
                                                key={item.cart_item_id}
                                                className="hover:bg-muted/40 transition-colors"
                                            >
                                                {/* Days in cart */}
                                                <TableCell className="font-semibold text-primary">
                                                    {item.days_in_cart}d
                                                </TableCell>

                                                {/* Date added */}
                                                <TableCell className="whitespace-nowrap text-sm">
                                                    {formatDate(item.date_added)}
                                                </TableCell>

                                                {/* User name */}
                                                <TableCell className="max-w-[120px] truncate font-medium">
                                                    {item.user_name}
                                                </TableCell>

                                                {/* Email */}
                                                <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                                                    {item.email}
                                                </TableCell>

                                                {/* Total orders */}
                                                <TableCell className="text-center text-sm">
                                                    {item.total_orders}
                                                </TableCell>

                                                {/* Product title */}
                                                <TableCell className="max-w-[180px]">
                                                    <div className="truncate font-medium text-sm">
                                                        {item.product_title}
                                                    </div>
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                        {item.product_type}
                                                    </div>
                                                </TableCell>

                                                {/* Selling price */}
                                                <TableCell className="whitespace-nowrap text-sm font-medium">
                                                    {formatCurrency(item.selling_price)}
                                                </TableCell>

                                                {/* Stock */}
                                                <TableCell className="text-center">
                                                    <span
                                                        className={
                                                            item.stock < 5
                                                                ? 'text-red-600 font-semibold'
                                                                : item.stock < 20
                                                                    ? 'text-yellow-600 font-semibold'
                                                                    : 'text-green-700'
                                                        }
                                                    >
                                                        {item.stock}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
                <p className="text-sm text-muted-foreground">
                    Showing{' '}
                    <span className="font-medium">{items.length}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> items &nbsp;•&nbsp;
                    Page <span className="font-medium">{pagination.page}</span> of{' '}
                    <span className="font-medium">{pagination.total_pages}</span>
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={page === 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={page >= pagination.total_pages || loading}
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
