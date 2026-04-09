import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CreditCard,
    Clock,
    Truck,
    Package,
    XCircle,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    IndianRupee,
    RefreshCw,
    Building,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    Info,
    Wallet,
    Calendar,
    ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { formatDate, cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import refundService from "@/services/refund.service";

const STATUS_CONFIG = {
    SETTLED: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: CheckCircle, label: "Settled" },
    PROCESSING: { color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: RefreshCw, label: "Processing" },
    PENDING: { color: "bg-orange-500/10 text-orange-600 border-orange-200", icon: Clock, label: "Pending" },
    FAILED: { color: "bg-red-500/10 text-red-600 border-red-200", icon: AlertCircle, label: "Failed" },
    RETRYING: { color: "bg-purple-500/10 text-purple-600 border-purple-200", icon: RefreshCw, label: "Retrying" },
    // Return Statuses
    RETURN_REQUESTED: { color: "bg-gray-500/10 text-gray-600 border-gray-200", icon: Clock, label: "Request Pending" },
    RETURN_APPROVED: { color: "bg-blue-500/10 text-blue-600 border-blue-200", icon: CheckCircle, label: "Approved" },
    PICKUP_SCHEDULED: { color: "bg-indigo-500/10 text-indigo-600 border-indigo-200", icon: Truck, label: "Pickup Ready" },
    IN_TRANSIT: { color: "bg-amber-500/10 text-amber-600 border-amber-200", icon: Truck, label: "In Transit" },
    RTO_COMPLETED: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-200", icon: Package, label: "Received" },
    REJECTED: { color: "bg-red-500/10 text-red-600 border-red-200", icon: XCircle, label: "Rejected" },
};

export default function MyRefunds() {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [filters, setFilters] = useState({ status: 'all', type: 'all', search: '' });

    const navigate = useNavigate();
    const { toast } = useToast();

    const filteredRefunds = (refunds || []).filter(refund => {
        const search = (filters.search || "").trim().toLowerCase();
        if (!search) return true;

        const orderId = (refund.orderId || "").toString().toLowerCase();
        const reason = (refund.reason || "").toString().toLowerCase();
        return orderId.includes(search) || reason.includes(search);
    });

    const fetchRefunds = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const data = await refundService.getMyRefunds({
                page,
                status: filters.status,
                type: filters.type,
                limit: 10
            });

            if (data && data.refunds) {
                console.log("[REFUND_UI_DEBUG] Data received from service:", data);
                setRefunds(data.refunds);
                setPagination(data.pagination);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to load refund history",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [filters, toast]);

    useEffect(() => {
        fetchRefunds(1);
    }, [fetchRefunds]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
                        Refunds & Payouts
                    </h1>
                    <p className="text-muted-foreground">
                        Track and manage your return/cancellation settlements
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10 shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-none mb-1">
                            Average Settlement
                        </p>
                        <p className="text-sm font-bold text-foreground">15-22 Working Days</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="border-none shadow-sm bg-secondary/20 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[240px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Order ID or Refund ID..."
                            className="pl-10 bg-background border-border/50"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                            <SelectTrigger className="w-[140px] bg-background">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="settled">Settled</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
                            <SelectTrigger className="w-[140px] bg-background">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="return">Returns</SelectItem>
                                <SelectItem value="cancellation">Cancellations</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* List Section */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />
                    ))}
                </div>
            ) : filteredRefunds.length === 0 ? (
                <Card className="border-dashed border-2 py-20 bg-muted/10">
                    <CardContent className="flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center">
                            <RefreshCw className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">No Records Found</h3>
                            <p className="text-muted-foreground max-w-sm">
                                We couldn't find any refunds matching your filters. Try clearing them or check your order history.
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setFilters({ status: 'all', type: 'all', search: '' })}
                        >
                            Clear All Filters
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <AnimatePresence mode="popLayout">
                        {filteredRefunds.map((refund) => (
                            <motion.div
                                key={refund.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                            >
                                <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all shadow-sm hover:shadow-xl group">
                                    <div className="flex flex-col lg:flex-row">
                                        {/* Financial Summary Pane */}
                                        <div className="lg:w-80 p-8 bg-secondary/10 border-b lg:border-b-0 lg:border-r border-border/50 space-y-8">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                                        Total Refund Amount
                                                    </span>
                                                    <h3 className="text-3xl font-display font-bold text-foreground">
                                                        ₹{refund.amount.toLocaleString()}
                                                    </h3>
                                                </div>
                                                <Badge className={cn("px-3 py-1 rounded-full text-[10px] font-bold border", STATUS_CONFIG[refund.status]?.color)}>
                                                    {STATUS_CONFIG[refund.status]?.label}
                                                </Badge>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Original Order</span>
                                                    <span className="font-semibold">₹{refund.originalAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-red-500 font-medium">
                                                    <span>Deductions</span>
                                                    <span>- ₹{refund.deduction.toLocaleString()}</span>
                                                </div>
                                                <div className="pt-4 border-t border-border/50">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                                                        <Info className="h-3 w-3" />
                                                        Refund Method
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Building className="h-4 w-4 text-primary" />
                                                        <div className="text-xs">
                                                            <p className="font-bold">Original Source</p>
                                                            <p className="text-muted-foreground">PayU Corporate Payout</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {refund.isFailed && (
                                                <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-red-200">
                                                    Retry Refund
                                                </Button>
                                            )}
                                        </div>

                                        {/* Timeline & Details Pane */}
                                        <div className="flex-1 p-8 space-y-8 bg-card">
                                            {/* Top Metadata */}
                                            <div className="flex flex-wrap justify-between gap-6 pb-6 border-b border-border/30">
                                                <div className="flex gap-8">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Refund ID</p>
                                                        <p className="text-sm font-mono font-bold text-primary">{refund.refundId}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order Reference</p>
                                                        <Button
                                                            variant="link"
                                                            className="p-0 h-auto text-sm font-bold flex items-center gap-1"
                                                            onClick={() => navigate(`/orders/${refund.orderId}`)}
                                                        >
                                                            #{refund.orderId}
                                                            <ArrowUpRight className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {refund.transactionId && (
                                                    <div className="space-y-1 text-right">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transaction Ref</p>
                                                        <Badge variant="secondary" className="font-mono text-[10px] font-bold px-2 py-1">
                                                            {refund.transactionId}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Timeline Visualizer */}
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Settlement Timeline</h4>
                                                    <span className="text-[10px] font-medium px-2 py-0.5 bg-secondary rounded-full text-secondary-foreground">
                                                        ETA: {formatDate(refund.expectedSettlement)}
                                                    </span>
                                                </div>

                                                <div className="relative pt-2 pb-6">
                                                    {/* Progress Line */}
                                                    <div className="absolute top-5 left-0 w-full h-0.5 bg-muted rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(refund.currentStep / 3) * 100}%` }}
                                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                                        />
                                                    </div>

                                                    {/* Steps */}
                                                    <div className="relative flex justify-between">
                                                        {refund.timeline.map((step, idx) => (
                                                            <div key={idx} className="flex flex-col items-center text-center group/step">
                                                                <div className={cn(
                                                                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10",
                                                                    step.isCompleted
                                                                        ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                                        : "bg-background border-muted group-hover/step:border-primary/50"
                                                                )}>
                                                                    {step.isCompleted ? (
                                                                        <CheckCircle className="h-4 w-4" />
                                                                    ) : (
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-muted group-hover/step:bg-primary/50 transition-colors" />
                                                                    )}
                                                                </div>
                                                                <div className="mt-3 space-y-0.5">
                                                                    <p className={cn("text-[10px] font-bold tracking-tight", step.isCompleted ? "text-foreground" : "text-muted-foreground")}>
                                                                        {step.label}
                                                                    </p>
                                                                    {step.date && (
                                                                        <p className="text-[9px] text-muted-foreground font-medium">
                                                                            {new Date(step.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Reason Breakdown */}
                                            <div className="p-4 bg-secondary/5 rounded-2xl border border-border/50 flex items-start gap-4">
                                                <div className="h-8 w-8 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Refund Reason ({refund.type})</p>
                                                    <p className="text-sm font-medium text-foreground">
                                                        "{refund.reason}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between pt-6 border-t border-border">
                        <div className="text-sm text-muted-foreground font-medium">
                            Showing <span className="text-foreground font-bold">{refunds.length}</span> of <span className="text-foreground font-bold">{pagination.total}</span> records
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === 1}
                                onClick={() => fetchRefunds(pagination.page - 1)}
                                className="h-9 px-4 rounded-xl border-border/50 hover:bg-secondary/50"
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>

                            <div className="flex items-center gap-1 mx-2">
                                {[...Array(pagination.totalPages)].map((_, i) => (
                                    <Button
                                        key={i}
                                        variant={pagination.page === i + 1 ? "default" : "ghost"}
                                        size="icon"
                                        className="h-8 w-8 rounded-lg text-xs font-bold"
                                        onClick={() => fetchRefunds(i + 1)}
                                    >
                                        {i + 1}
                                    </Button>
                                ))}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={pagination.page === pagination.totalPages}
                                onClick={() => fetchRefunds(pagination.page + 1)}
                                className="h-9 px-4 rounded-xl border-border/50 hover:bg-secondary/50"
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Helpcard */}
            <div className="mt-12 bg-primary/5 rounded-3xl p-8 border border-primary/10 flex flex-col md:flex-row gap-8 items-center text-center md:text-left shadow-sm">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IndianRupee className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                    <h4 className="text-lg font-bold text-foreground">How do settlements work?</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Refunds for returns are processed after the item reaches our warehouse and passes quality checks (usually 7-10 days).
                        Once settled, it may take 2-5 working days for your bank to reflect the amount.
                    </p>
                </div>
                <Button
                    className="bg-primary text-primary-foreground font-bold px-8 h-12 rounded-2xl shadow-xl shadow-primary/20"
                    onClick={() => navigate('/help')}
                >
                    Help Center
                </Button>
            </div>
        </div>
    );
}