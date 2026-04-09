import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '@/config/api';
import {
    ArrowLeft, Package, Truck, CheckCircle, MapPin,
    Download, CreditCard, Calendar, Clock, AlertTriangle,
    FileText, ShoppingBag, XCircle, ChevronRight, BookOpen,
    RotateCcw, History, RefreshCw, MessageSquare, Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PaymentInfoCard from '@/components/features/order/PaymentInfoCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { cn, getOrderDisplayStatus, STATUS_CONFIG, formatDate } from '@/lib/utils';
import { DialogClose } from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';

import { useSiteSettings } from '@/context/SiteSettingsContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Layout, orderService } from '@/index.js';


const ORDER_STATUS_STEPS = [
    { status: 'PENDING', label: 'Order Placed', icon: FileText, dateKey: 'created_at' },
    { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle, dateKey: 'confirmed_at' },
    { status: 'PACKED', label: 'Packed', icon: Package, dateKey: 'packed_at' },
    { status: 'IN_TRANSIT', label: 'Shipped', icon: Truck, dateKey: 'shipped_at' },
    { status: 'DELIVERED', label: 'Delivered', icon: MapPin, dateKey: 'delivered_at' },
];

const RETURN_STATUS_STEPS = [
    { status: 'RETURN_REQUESTED', label: 'Requested', icon: RotateCcw },
    { status: 'RETURN_APPROVED', label: 'Approved', icon: CheckCircle },
    { status: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled', icon: Truck },
    { status: 'IN_TRANSIT', label: 'In Transit', icon: Clock },
    { status: 'RTO_COMPLETED', label: 'Return Received', icon: Package },
    { status: 'REFUND_PENDING', label: 'Refund Pending', icon: CreditCard },
    { status: 'REFUND_PROCESSING', label: 'Processing', icon: RefreshCw },
    { status: 'REFUND_SETTLED', label: 'Refund Settled', icon: CheckCircle },
];

export default function OrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [returning, setReturning] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    const [bankDetails, setBankDetails] = useState({
        bank_account_name: "",
        bank_account_number: "",
        bank_ifsc: "",
        bank_name: "",
        upi_id: ""
    });
    const [savedBankDetails, setSavedBankDetails] = useState(null);
    const [useSavedAccount, setUseSavedAccount] = useState(true);

    useEffect(() => {
        fetchOrder();
        fetchSavedBankDetails();
    }, [id]);

    const fetchSavedBankDetails = async () => {
        try {
            const res = await api.get('/api/users/me/bank-details');
            if (res.data.success && res.data.data) {
                setSavedBankDetails(res.data.data);
                // Pre-fill fields for consistency even if not showing them
                setBankDetails({
                    bank_account_name: res.data.data.account_holder_name || "",
                    bank_account_number: res.data.data.account_number || "",
                    bank_ifsc: res.data.data.ifsc_code || "",
                    bank_name: res.data.data.bank_name || "",
                    upi_id: ""
                });
            }
        } catch (err) {
            console.error('Failed to fetch bank details', err);
        }
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/orders/${id}`);
            if (res.data.success) {
                setOrder(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch order', err);
            setError('Failed to load order details. You may not have permission to view this order.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        try {
            setCancelling(true);
            const res = await orderService.cancelOrder(id);
            if (res.data.success) {
                toast({
                    title: "Order Cancelled",
                    description: "Your order has been cancelled successfully."
                });
                fetchOrder();
            }
        } catch (error) {
            toast({
                title: "Cancellation Failed",
                description: error.response?.data?.message || "Could not cancel order",
                variant: "destructive"
            });
        } finally {
            setCancelling(false);
        }
    };

    const handleBankDetailsChange = (e) => {
        setBankDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRequestReturn = async () => {
        if (!returnReason.trim()) {
            toast({ title: "Reason Required", description: "Please provide a reason for the return.", variant: "destructive" });
            return;
        }

        // Logic refined: All physical returns need bank details for safe fallback
        const finalBankDetails = useSavedAccount && savedBankDetails ? {
            bank_account_name: savedBankDetails.account_holder_name,
            bank_account_number: savedBankDetails.account_number,
            bank_ifsc: savedBankDetails.ifsc_code,
            bank_name: savedBankDetails.bank_name
        } : bankDetails;

        if (!finalBankDetails.bank_account_name || !finalBankDetails.bank_account_number || !finalBankDetails.bank_ifsc) {
            toast({ title: "Bank Details Required", description: "Please provide valid bank details for the refund payout.", variant: "destructive" });
            return;
        }

        try {
            setReturning(true);
            const res = await orderService.requestReturn(id, returnReason, finalBankDetails);
            if (res.data.success) {
                toast({
                    title: "Return Requested",
                    description: "Your return request has been submitted successfully."
                });
                fetchOrder();
            }
        } catch (error) {
            toast({
                title: "Return Request Failed",
                description: error.response?.data?.message || "Could not request return",
                variant: "destructive"
            });
        } finally {
            setReturning(false);
        }
    };

    const handleDownloadInvoice = async () => {
        if (!order) return;
        try {
            setDownloading(true);
            const res = await orderService.getInvoice(id);
            if (res.data.success && res.data.data.url) {
                window.open(res.data.data.url, '_blank');
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
        } finally {
            setDownloading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(price || 0);
    };

    const getStatusStepIndex = (orderStatus, shipments = []) => {
        if (orderStatus === 'CANCELLED' || orderStatus === 'CANCEL_REQUESTED') return -1;
        if (orderStatus.startsWith('RETURN_') || orderStatus === 'REFUNDED') return -2;

        const shipStatus = shipments && shipments.length > 0 ? shipments[0].admin_status : null;

        if (shipStatus === 'DELIVERED' || orderStatus === 'DELIVERED') return 4;
        if (['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'SHIPPED', 'PICKED UP', 'PICKED_UP'].includes(shipStatus) || orderStatus === 'SHIPPED') return 3;
        if (['PACKED', 'AWB_ASSIGNED', 'SHIPMENT_CREATED'].includes(shipStatus) || orderStatus === 'PACKED' || orderStatus === 'AWB_ASSIGNED') return 2;
        if (orderStatus === 'CONFIRMED' || orderStatus === 'PAID') return 1;

        return 0; // PENDING
    };

    const getReturnStepIndex = (orderStatus) => {
        if (orderStatus === 'RETURN_REJECTED') return -3;
        switch (orderStatus) {
            case 'RETURN_REQUESTED': return 0;
            case 'RETURN_APPROVED': return 1;
            case 'PICKUP_SCHEDULED': return 2;
            case 'IN_TRANSIT': return 3;
            case 'RTO_COMPLETED': return 4;
            case 'REFUND_PENDING': return 5;
            case 'REFUND_PROCESSING': return 6;
            case 'REFUND_SETTLED': return 7;
            case 'REFUNDED': return 7; // Legacy compatibility
            default: return -1;
        }
    };

    const effectiveStatus = order?.return_status || order?.status;
    const currentStepIndex = order ? getStatusStepIndex(order.status, order.shipments) : 0;
    const currentReturnStepIndex = order ? getReturnStepIndex(effectiveStatus) : -1;
    const isCancelled = order?.status === 'CANCELLED';
    const isCancelRequested = order?.status === 'CANCEL_REQUESTED';
    const isDigital = order?.order_type === 'DIGITAL';
    const isReturning = order?.status.startsWith('RETURN_') || order?.status === 'REFUNDED' || !!order?.return_status;
    const isReturnable = order?.status === 'DELIVERED' && !isDigital && !isReturning;
    const isShipped = ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(order?.status);

    if (loading) {
        return (
            <Layout>
                <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground animate-pulse">Loading order details...</p>
                </div>
            </Layout>
        );
    }

    if (error || !order) {
        return (
            <Layout>
                <div className="container py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
                    <p className="text-muted-foreground mb-8">{error || "The requested order details could not be retrieved."}</p>
                    <Button onClick={() => navigate('/dashboard')} className="w-full sm:w-auto">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-background py-12">
                <div className="container max-w-5xl mx-auto px-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-2 pl-0 hover:bg-transparent -ml-2 text-muted-foreground hover:text-primary">
                                <ArrowLeft className="mr-1 h-4 w-4" /> Back to Orders
                            </Button>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                Order #{order.id}
                                <Badge
                                    className={cn(
                                        "text-sm px-3 py-1 rounded-full border",
                                        STATUS_CONFIG[getOrderDisplayStatus(order)]?.color || STATUS_CONFIG.UNKNOWN.color
                                    )}
                                >
                                    {STATUS_CONFIG[getOrderDisplayStatus({ ...order, status: effectiveStatus })]?.label || effectiveStatus.replace(/_/g, ' ')}
                                </Badge>
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                Placed on {formatDate(order.created_at)}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            {isReturnable && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                                            Request Return
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Request Return for Order #{order.id}</DialogTitle>
                                            <DialogDescription>
                                                Please tell us why you want to return this order. Returns are subject to our refund policy.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Reason for Return</label>
                                                <Textarea
                                                    placeholder="e.g., Damaged item, Wrong book received, Quality not as expected..."
                                                    value={returnReason}
                                                    onChange={(e) => setReturnReason(e.target.value)}
                                                    className="min-h-[100px]"
                                                />
                                            </div>
                                            <div className="space-y-4 border-t pt-4">
                                                <h3 className="font-semibold text-sm">Refund Payout Method</h3>
                                                
                                                {savedBankDetails && useSavedAccount ? (
                                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-[10px] font-bold text-primary uppercase">Saved Bank Account</p>
                                                                <p className="text-sm font-semibold mt-1">{savedBankDetails.bank_name}</p>
                                                                <p className="text-xs text-muted-foreground">A/C: {savedBankDetails.account_number} | {savedBankDetails.ifsc_code}</p>
                                                                <p className="text-xs text-muted-foreground">Holder: {savedBankDetails.account_holder_name}</p>
                                                            </div>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-primary text-xs h-7 px-2 hover:bg-primary/10"
                                                                onClick={() => setUseSavedAccount(false)}
                                                            >
                                                                Use different account
                                                            </Button>
                                                        </div>
                                                        <p className="text-[11px] text-primary/70 bg-primary/10 p-2 rounded-lg italic">
                                                            Proceed with this account for the refund payout?
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {savedBankDetails && (
                                                            <div className="flex justify-end">
                                                                <Button 
                                                                    variant="link" 
                                                                    size="sm" 
                                                                    className="text-xs p-0 h-auto"
                                                                    onClick={() => setUseSavedAccount(true)}
                                                                >
                                                                    Use saved account instead
                                                                </Button>
                                                            </div>
                                                        )}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Account Holder Name *</label>
                                                                <input
                                                                    type="text"
                                                                    name="bank_account_name"
                                                                    placeholder="Enter account holder name"
                                                                    value={bankDetails.bank_account_name}
                                                                    onChange={handleBankDetailsChange}
                                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Account Number *</label>
                                                                <input
                                                                    type="text"
                                                                    name="bank_account_number"
                                                                    placeholder="Enter account number"
                                                                    value={bankDetails.bank_account_number}
                                                                    onChange={handleBankDetailsChange}
                                                                    onFocus={(e) => {
                                                                        if (e.target.value.startsWith('XXXX')) {
                                                                            setBankDetails(prev => ({ ...prev, bank_account_number: '' }));
                                                                        }
                                                                    }}
                                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">IFSC Code *</label>
                                                                <input
                                                                    type="text"
                                                                    name="bank_ifsc"
                                                                    placeholder="e.g., SBIN0001234"
                                                                    value={bankDetails.bank_ifsc}
                                                                    onChange={handleBankDetailsChange}
                                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium">Bank Name *</label>
                                                                <input
                                                                    type="text"
                                                                    name="bank_name"
                                                                    placeholder="e.g., State Bank of India"
                                                                    value={bankDetails.bank_name}
                                                                    onChange={handleBankDetailsChange}
                                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                />
                                                            </div>
                                                            <div className="space-y-2 md:col-span-2">
                                                                <label className="text-xs font-medium">UPI ID (Optional)</label>
                                                                <input
                                                                    type="text"
                                                                    name="upi_id"
                                                                    placeholder="e.g., yourname@upi"
                                                                    value={bankDetails.upi_id}
                                                                    onChange={handleBankDetailsChange}
                                                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs text-muted-foreground flex gap-2">
                                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                                <p>Physical items will be picked up from your delivery address after approval. Digital items (ebooks) cannot be returned.</p>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline">Cancel</Button>
                                            </DialogClose>
                                            <Button variant="default" onClick={handleRequestReturn} disabled={returning}>
                                                {returning ? "Processing..." : "Submit Return Request"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}

                            {order.status !== 'DELIVERED' && !isCancelled && !isCancelRequested && !isReturning && !isShipped && (
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="text-foreground border-border hover:bg-accent hover:text-foreground">
                                            {isDigital ? "Cancel Digital Order" : "Cancel Order"}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Cancel Order #{order.id}?</DialogTitle>
                                            <DialogDescription>
                                                {isDigital
                                                    ? "Are you sure you want to cancel this digital order? This is only possible if you haven't accessed the content yet."
                                                    : "Are you sure you want to cancel this order? This action may initiate an RTO if the order is already shipped."}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline">Keep Order</Button>
                                            </DialogClose>
                                            <Button variant="destructive" onClick={handleCancelOrder} disabled={cancelling}>
                                                {cancelling ? "Processing..." : "Confirm Cancellation"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                            <Button onClick={handleDownloadInvoice} disabled={downloading} variant="default" className="shadow-sm">
                                {downloading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Downloading...
                                    </span>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" /> Download Invoice
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Progress Tracker (Normal) */}
                    {!isCancelled && !isCancelRequested && !isDigital && !isReturning && (
                        <Card className="mb-8 border-none shadow-md overflow-hidden bg-card">
                            <CardHeader className="bg-muted/30 pb-2 pt-4 px-6">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" /> Delivery Progress
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 pb-8 px-6 md:px-12 bg-card">
                                <div className="relative overflow-x-auto md:overflow-visible pb-4">
                                    <div className="min-w-[520px] md:min-w-0 relative">
                                        {/* Connector Line */}
                                        <div className="absolute top-5 left-0 right-0 h-1 bg-muted -z-0 mx-4 md:mx-8">
                                            <div
                                                className="h-full bg-primary transition-all duration-700 ease-out"
                                                style={{ width: `${Math.max(0, (currentStepIndex / (ORDER_STATUS_STEPS.length - 1)) * 100)}%` }}
                                            ></div>
                                        </div>

                                        <div className="flex justify-between relative z-10">                                        {ORDER_STATUS_STEPS.map((step, index) => {
                                            const Icon = step.icon;
                                            const isCompleted = index <= currentStepIndex;
                                            const isCurrent = index === currentStepIndex;

                                            return (
                                                <div key={step.status} className="flex flex-col items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 shadow-sm",
                                                        isCompleted ? "bg-primary border-primary text-primary-foreground scale-110" : "bg-card border-muted text-muted-foreground",
                                                        isCurrent && "ring-4 ring-primary/20",
                                                        !isCompleted && "bg-muted/50"
                                                    )}>
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className={cn("text-xs font-semibold uppercase tracking-wide", isCompleted ? "text-primary" : "text-muted-foreground")}>
                                                            {step.label}
                                                        </p>
                                                        {isCompleted && order[step.dateKey] && (
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                                                {formatDate(order[step.dateKey])}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Return Progress Tracker */}
                    {isReturning && (
                        <Card className={cn(
                            "mb-8 border-none shadow-md overflow-hidden",
                            order.status === 'RETURN_REJECTED' ? "bg-red-50" : "bg-primary/5"
                        )}>
                            <CardHeader className={cn(
                                "pb-2 pt-4 px-6",
                                order.status === 'RETURN_REJECTED' ? "bg-red-100/50" : "bg-primary/10"
                            )}>
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <History className={cn("h-4 w-4", order.status === 'RETURN_REJECTED' ? "text-red-600" : "text-primary")} />
                                    {order.status === 'RETURN_REJECTED' ? "Return Request Denied" : "Return & Refund Lifecycle"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-8 pb-10 px-6 md:px-12">
                                {order.status === 'RETURN_REJECTED' ? (
                                    <div className="flex items-center gap-4 text-red-800">
                                        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <XCircle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold">This return request has been rejected.</p>
                                            <p className="text-sm opacity-80">{order.admin_remarks || "Please contact support for more details."}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="absolute top-5 left-0 right-0 h-1 bg-white/50 -z-0 mx-4 md:mx-8">
                                            <div
                                                className="h-full bg-primary transition-all duration-700 ease-out"
                                                style={{ width: `${Math.max(0, (currentReturnStepIndex / (RETURN_STATUS_STEPS.length - 1)) * 100)}%` }}
                                            ></div>
                                        </div>

                                        <div className="flex justify-between relative z-10">
                                            {RETURN_STATUS_STEPS.map((step, index) => {
                                                const Icon = step.icon;
                                                const isCompleted = index <= currentReturnStepIndex;
                                                const isCurrent = index === currentReturnStepIndex;

                                                return (
                                                    <div key={step.status} className="flex flex-col items-center gap-3">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 shadow-sm",
                                                            isCompleted ? "bg-primary border-primary text-primary-foreground scale-110 shadow-lg" : "bg-card border-muted text-muted-foreground",
                                                            isCurrent && "ring-4 ring-primary/20",
                                                            !isCompleted && "bg-card"
                                                        )}>
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className={cn("text-xs font-semibold uppercase tracking-wide", isCompleted ? "text-primary" : "text-muted-foreground")}>
                                                                {step.label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {order.refund_status === 'REFUND_PROCESSED' && (
                                    <div className="mt-8 p-4 bg-green-100/50 border border-green-200 rounded-2xl flex items-center gap-4 text-green-800">
                                        <div className="h-10 w-10 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Refund Successfully Processed</p>
                                            <p className="text-xs opacity-80">Reference ID: {order.refund_id}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {isCancelled && (
                        <Card className="mb-8 border-destructive/20 bg-destructive/5">
                            <CardContent className="flex items-center gap-4 py-8">
                                <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
                                    <XCircle className="h-6 w-6 text-destructive" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-destructive">Order Cancelled</h3>
                                    <p className="text-muted-foreground text-sm">This order was cancelled and any payment made has been initiated for refund.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Left Column: Items */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Tracking View for non-returned orders */}
                            {/* Tracking View for non-returned orders */}
                            {!isReturning && order.shipments && order.shipments.length > 0 && (
                                <Card className="border-border bg-card overflow-hidden shadow-sm mb-6">
                                    <CardHeader className="bg-secondary pb-3 px-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <CardTitle className="text-md flex items-center gap-2 text-foreground">
                                                <Truck className="h-5 w-5 text-primary" /> Tracking Information
                                            </CardTitle>
                                            <div className="flex gap-2">
                                                <Badge variant="outline" className="bg-background flex items-center gap-1.5 px-3 py-1 border-primary/20">
                                                    <Building className="h-3.5 w-3.5 text-primary" />
                                                    <span className="font-bold text-primary">{order.shipments[0]?.courier_name || 'Delhivery'}</span>
                                                </Badge>
                                                <Badge variant="outline" className="bg-background flex items-center gap-1 border-primary/20 font-mono text-xs">
                                                    #{order.awb_number || 'Pending'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {order.shipments.map((ship, sIdx) => (
                                            <div key={sIdx} className="divide-y divide-border">
                                                {ship.tracking_url && (
                                                    <div className="p-4 bg-muted/20 flex justify-end">
                                                        <Button 
                                                            variant="link" 
                                                            size="sm" 
                                                            className="text-primary h-auto p-0 flex items-center gap-1 text-xs"
                                                            onClick={() => {
                                                                let url = ship.tracking_url;
                                                                if (!url) return;
                                                                if (url.includes('undefined') || url.includes('null') || !url.startsWith('http')) {
                                                                    const awb = ship.awb_code || url.replace('undefined', '').replace('null', '').replace('https://', '').replace('http://', '');
                                                                    url = `https://www.delhivery.com/track/package/${awb}`;
                                                                }
                                                                window.open(url, '_blank');
                                                            }}
                                                        >
                                                            Open in Delhivery <ChevronRight className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                                
                                                <div className="p-6">
                                                    {ship.tracking_history && ship.tracking_history.length > 0 ? (
                                                        <div className="relative pl-6 space-y-6">
                                                            {/* Vertical Line */}
                                                            <div className="absolute left-[2.5px] top-1.5 bottom-1.5 w-0.5 bg-primary/10"></div>
                                                            
                                                            {ship.tracking_history.map((t, tIdx) => (
                                                                <div key={tIdx} className="relative">
                                                                    <div className={cn(
                                                                        "absolute -left-[27.5px] top-1.5 w-2 h-2 rounded-full",
                                                                        tIdx === 0 ? "bg-primary ring-4 ring-primary/20 animate-pulse" : "bg-muted-foreground/30"
                                                                    )}></div>
                                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                                                                        <p className={cn(
                                                                            "text-sm font-semibold leading-tight",
                                                                            tIdx === 0 ? "text-foreground" : "text-muted-foreground"
                                                                        )}>
                                                                            {t.activity}
                                                                        </p>
                                                                        <p className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded">
                                                                            {new Date(t.activity_date).toLocaleString('en-IN', {
                                                                                day: 'numeric', month: 'short',
                                                                                hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                        </p>
                                                                    </div>
                                                                    {t.location && (
                                                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                            <MapPin className="h-3 w-3" /> {t.location}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-6">
                                                            <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                                                                <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                                                            </div>
                                                            <p className="text-sm font-medium text-muted-foreground">Shipment details are being synced...</p>
                                                            <p className="text-xs text-muted-foreground/60 mt-1">Please come back in 15-20 minutes for live updates.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Return Details View */}
                            {isReturning && (
                                <Card className="border-border bg-card shadow-sm">
                                    <CardHeader className="bg-muted/30 border-b border-border">
                                        <CardTitle className="text-md flex items-center gap-2 text-foreground">
                                            <RotateCcw className="h-5 w-5" /> Return Claim Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-6">
                                            <div className="bg-card p-4 rounded-xl border border-border">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Claimed Status</p>
                                                <div className="flex items-center gap-3">
                                                    <Badge className="bg-primary text-primary-foreground border-none">{effectiveStatus.replace(/_/g, ' ')}</Badge>
                                                    <span className="text-muted-foreground text-xs">Updated recently</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                                                        <MessageSquare className="h-3 w-3" /> Your Reason
                                                    </p>
                                                    <p className="text-sm bg-muted/30 p-4 rounded-xl border italic leading-relaxed text-foreground">
                                                        "{order.return_reason || 'No reason specified'}"
                                                    </p>
                                                </div>
                                                {order.admin_remarks && (
                                                    <div className="space-y-1">
                                                        <p className="text-xs font-bold text-primary uppercase flex items-center gap-1.5 mb-2">
                                                            <CheckCircle className="h-3 w-3" /> Admin Response
                                                        </p>
                                                        <p className="text-sm bg-primary/5 p-4 rounded-xl border border-primary/20 leading-relaxed font-medium">
                                                            {order.admin_remarks}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="shadow-sm border-none overflow-hidden bg-card">
                                <CardHeader className="bg-muted/30 border-b pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <ShoppingBag className="h-5 w-5 text-primary" />
                                        Cart Items ({order.items?.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-border">
                                        {order.items?.map((item) => (
                                            <div key={item.id} className="p-6 flex gap-6 hover:bg-muted/30 transition-colors">
                                                <div className="h-28 w-22 bg-muted rounded-xl border border-border overflow-hidden flex-shrink-0 shadow-sm">
                                                    {item.product_image || item.image_url ? (
                                                        <img
                                                            src={item.product_image || item.image_url}
                                                            alt={item.product_title}
                                                            className="h-full w-full object-cover transform hover:scale-105 transition-transform duration-500"
                                                            onError={(e) => e.target.src = '/placeholder.svg'}
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center bg-muted text-xs text-muted-foreground uppercase font-bold tracking-tighter">No Preview</div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                    <div>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-bold text-lg text-foreground line-clamp-1 leading-tight">{item.product_title}</h4>
                                                            <p className="font-black text-lg text-primary">{formatPrice(item.price * item.quantity)}</p>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                            Published by <span className="text-foreground font-semibold">{item.product_author || 'Independent Seller'}</span>
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3 text-xs mt-4">
                                                        <Badge variant="outline" className="bg-card border-border shadow-sm rounded-lg px-3 text-foreground">QTY: {item.quantity}</Badge>
                                                        <Badge variant="outline" className="bg-card border-border shadow-sm rounded-lg px-3 text-foreground">Price: {formatPrice(item.price)}</Badge>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest bg-muted px-2 py-1 rounded">Format: {item.format}</span>
                                                    </div>

                                                    {/* Digital product actions & policy */}
                                                    {item.format === 'EBOOK' && (
                                                        <div className="mt-5 p-4 rounded-2xl bg-primary/5 border border-primary/10">
                                                            <div className="flex flex-col sm:flex-row gap-3">
                                                                {(order.status === 'CONFIRMED' || order.status === 'COMPLETED' || order.payment_status === 'PAID') && (
                                                                    <Button
                                                                        variant="default"
                                                                        className="h-10 px-6 rounded-xl font-bold shadow-lg shadow-primary/20"
                                                                        onClick={() => navigate(`/ebooks/${order.id}/read/${item.product_id}`)}
                                                                    >
                                                                        <BookOpen className="mr-2 h-4 w-4" />
                                                                        Open E-reader
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <div className="mt-4 flex items-start gap-2.5 text-primary/70">
                                                                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                                <p className="text-[11px] leading-relaxed font-medium">
                                                                    Digital content is linked to your account. Redistribution or copying is strictly prohibited under our Terms.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-none overflow-hidden bg-card">
                                <CardHeader className="bg-muted/30 border-b pb-4 px-6">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        Shipping Destination
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <div className="flex items-start gap-5">
                                        <div className="p-3 bg-primary/10 rounded-2xl">
                                            < Truck className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-sm text-foreground font-bold uppercase tracking-widest text-primary/60">Recipient</p>
                                            <p className="text-lg font-medium text-foreground leading-relaxed whitespace-pre-line tracking-tight">
                                                {typeof order.shipping_address === 'object'
                                                    ? `${order.shipping_address.address_line1}, ${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.postal_code || order.shipping_address.pin}`
                                                    : (order.shipping_address || 'No shipping address provided.')}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Address & Summary */}
                        <div className="space-y-6 md:sticky md:top-24 self-start">
                            <Card className="shadow-xl border-primary/10 overflow-hidden rounded-3xl">
                                <CardHeader className="bg-primary/5 pb-5 pt-8 px-8">
                                    <CardTitle className="text-xl font-bold font-heading">Financial Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm font-medium text-muted-foreground">
                                            <span>Subtotal</span>
                                            <span className="text-foreground">{formatPrice(order.subtotal_amount || (order.total_amount - (order.shipping_amount || 0)))}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-medium text-muted-foreground">
                                            <span>Shipping</span>
                                            <span className={cn((order.shipping_amount > 0) ? "text-foreground" : "text-green-600 font-bold")}>
                                                {(order.shipping_amount > 0) ? formatPrice(order.shipping_amount) : "FREE"}
                                            </span>
                                        </div>
                                        {/* {order.cod_charges > 0 && (
                                            <div className="flex justify-between text-sm font-medium text-muted-foreground">
                                                <span>COD Charges</span>
                                                <span className="text-foreground">{formatPrice(order.cod_charges)}</span>
                                            </div>
                                        )} */}
                                        {order.tax_amount > 0 && (
                                            <div className="flex justify-between text-sm font-medium text-muted-foreground">
                                                <span>Tax</span>
                                                <span className="text-foreground">{formatPrice(order.tax_amount)}</span>
                                            </div>
                                        )}
                                        {Number(order.coupon_discount) > 0 && (
                                            <div className="flex justify-between text-sm font-medium">
                                                <span>Coupon Discount</span>
                                                <span className="text-green-600 font-bold">-{formatPrice(order.coupon_discount)}</span>
                                            </div>
                                        )}
                                        {Number(order.coin_discount) > 0 && (
                                            <div className="flex justify-between text-sm font-medium">
                                                <span>Reward Coins</span>
                                                <span className="text-amber-600 font-bold">-{formatPrice(order.coin_discount)}</span>
                                            </div>
                                        )}
                                        {order.coupon && (
                                            <div className="flex justify-between text-xs text-muted-foreground mt-0">
                                                <span>Code: {order.coupon.code}</span>
                                            </div>
                                        )}
                                    </div>

                                    <Separator className="bg-border" />

                                    <div className="flex justify-between items-baseline pt-2">
                                        <span className="font-bold text-lg text-foreground">Total Payable</span>
                                        <span className="font-black text-3xl text-primary tracking-tighter">{formatPrice(order.total_payable_amount || order.total_amount)}</span>
                                    </div>

                                    <div className="pt-4">
                                        <Badge variant="outline" className="w-full justify-center py-2 bg-muted/50 border-border rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                            ID: {order.order_id || 'BC-ORDER-' + order.id}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {order.payment && (
                                <PaymentInfoCard payment={order.payment} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}