import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    IndianRupee,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building,
    User,
    Receipt,
    ArrowRightLeft,
    ExternalLink,
    RefreshCw,
    Download
} from 'lucide-react';
import { adminService } from '@/index.js';
import { toast } from 'sonner';
import { formatDate, cn } from '@/lib/utils';

export default function AdminRefundLedger() {
    const [loading, setLoading] = useState(true);
    const [refunds, setRefunds] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({ status: 'all', order_id: '' });
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        loadRefunds();
    }, [pagination.page, filters]);

    async function loadRefunds() {
        try {
            setLoading(true);
            const res = await adminService.getRefundLedger(pagination.page, pagination.limit, filters);
            if (res.success && res.data) {
                setRefunds(res.data.items || []);
                setPagination(prev => ({
                    ...prev,
                    ...res.data.pagination
                }));
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load refund ledger');
        } finally {
            setLoading(false);
        }
    }

    const handleAction = async (refundId, action) => {
        try {
            setProcessingId(refundId);
            let res;

            if (action === 'approve') {
                res = await adminService.approveRefund(refundId);
            }
            else if (action === 'process') {
                res = await adminService.processRefund(refundId);
            }
            else if (action === 'settle') {
                res = await adminService.settleRefund(refundId);
            }
            else if (action === 'fail') {
                res = await adminService.failRefund(refundId);
            }
            if (res.success) {
                toast.success(`Refund ${action === 'settle' ? 'settled' : action === 'process' ? 'processing' : 'failed'} successfully`);
                loadRefunds();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'settled': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
            case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-200';
            case 'pending': return 'bg-orange-500/10 text-orange-600 border-orange-200';
            case 'failed': return 'bg-red-500/10 text-red-600 border-red-200';
            case 'approved': return 'bg-purple-500/10 text-purple-600 border-purple-200';
            default: return 'bg-slate-500/10 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
                        Customer Refund Management
                    </h1>
                    <p className="text-muted-foreground">
                        Track and process settlements for order returns and cancellations.
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10 shadow-sm">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <ArrowRightLeft className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">
                            Pending Payouts
                        </p>
                        <p className="text-sm font-bold text-foreground">
                            {pagination.total} Records
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="border-none shadow-sm bg-secondary/20 p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[240px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by Order ID..."
                            className="pl-10 bg-background border-border/50"
                            value={filters.order_id}
                            onChange={(e) => setFilters({ ...filters, order_id: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select
                            value={filters.status}
                            onValueChange={(v) => {
                                setFilters({ ...filters, status: v });
                                setPagination({ ...pagination, page: 1 });
                            }}
                        >
                            <SelectTrigger className="w-[160px] bg-background">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="APPROVED">Approved</SelectItem>
                                <SelectItem value="PROCESSING">Processing</SelectItem>
                                <SelectItem value="SETTLED">Settled</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={async () => {
                            try {
                                const filterParams = { ...filters };
                                if (filterParams.status === 'all') delete filterParams.status;
                                const blob = await adminService.exportRefundLedger(filterParams);
                                const url = window.URL.createObjectURL(new Blob([blob]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', `refund_ledger_${new Date().toISOString().split('T')[0]}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                window.URL.revokeObjectURL(url);
                            } catch (err) {
                                toast.error('Export failed');
                            }
                        }} className="bg-background">
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => loadRefunds()} className="bg-background">
                            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* List Table */}
            <Card className="border-border/50 shadow-xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-secondary/30 border-b border-border/50">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Reference</th>
                                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Customer</th>
                                    <th className="px-6 py-4 text-left font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Destination</th>
                                    <th className="px-6 py-4 text-right font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Amount</th>
                                    <th className="px-6 py-4 text-center font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                                    <th className="px-6 py-4 text-right font-semibold text-muted-foreground uppercase tracking-widest text-[10px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {loading && pagination.page === 1 ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="6" className="px-6 py-8 h-20 bg-muted/10"></td>
                                        </tr>
                                    ))
                                ) : refunds.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <Receipt className="h-10 w-10 opacity-20" />
                                                <p className="font-medium">No refund records found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    refunds.map((refund) => (
                                        <tr key={refund.id} className="hover:bg-secondary/10 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="font-mono text-[11px] font-bold text-primary flex items-center gap-1">
                                                        RF-{String(refund.id).padStart(5, '0')}
                                                        {refund.return_id ? (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-purple-500/5 text-purple-600 border-purple-200">Return</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-amber-500/5 text-amber-600 border-amber-200">Cancel</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-foreground flex items-center gap-1">
                                                        Order #{refund.order_id}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {formatDate(refund.created_at)}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                                        <User className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm leading-tight">{refund.user_name}</p>
                                                        <p className="text-[11px] text-muted-foreground leading-tight">{refund.user_email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {refund.account_number ? (
                                                    <div className="space-y-1 bg-secondary/20 p-2 rounded-lg border border-border/30">
                                                        <p className="text-[10px] font-bold flex items-center gap-1">
                                                            <Building className="h-3 w-3 text-muted-foreground" />
                                                            {refund.bank_name || 'Bank Details'}
                                                        </p>
                                                        <p className="text-[11px] font-mono text-muted-foreground">
                                                            {refund.account_number}
                                                        </p>
                                                        <p className="text-[9px] font-mono text-muted-foreground opacity-60">
                                                            IFSC: {refund.ifsc_code}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
                                                        <AlertCircle className="h-3 w-3" />
                                                        Original Payment Source
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-foreground">₹{Number(refund.amount).toLocaleString()}</p>
                                                    <p className="text-[10px] text-muted-foreground line-through opacity-50">₹{Number(refund.order_amount).toLocaleString()}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border shadow-none", getStatusColor(refund.status))}>
                                                    {refund.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {refund.status === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-[10px] font-bold border-purple-200 text-purple-600 hover:bg-purple-50"
                                                            disabled={processingId === refund.id}
                                                            onClick={() => handleAction(refund.id, 'approve')}
                                                        >
                                                            Approve
                                                        </Button>
                                                    )}

                                                    {refund.status === 'approved' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-[10px] font-bold border-blue-200 text-blue-600 hover:bg-blue-50"
                                                            disabled={processingId === refund.id}
                                                            onClick={() => handleAction(refund.id, 'process')}
                                                        >
                                                            Process
                                                        </Button>
                                                    )}

                                                    {refund.status === 'processing' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                className="h-8 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100"
                                                                disabled={processingId === refund.id}
                                                                onClick={() => handleAction(refund.id, 'settle')}
                                                            >
                                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Settle
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 text-[10px] font-bold border-red-200 text-red-600 hover:bg-red-50"
                                                                disabled={processingId === refund.id}
                                                                onClick={() => handleAction(refund.id, 'fail')}
                                                            >
                                                                Fail
                                                            </Button>
                                                        </>
                                                    )}

                                                    {refund.status === 'failed' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 text-[10px] font-bold border-orange-200 text-orange-600 hover:bg-orange-50"
                                                            disabled={processingId === refund.id}
                                                            onClick={() => handleAction(refund.id, 'process')}
                                                        >
                                                            Retry
                                                        </Button>
                                                    )}

                                                    {refund.status === 'settled' && (
                                                        <div className="flex flex-col items-end gap-1 opacity-50">
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                                                                <CheckCircle2 className="h-2.5 w-2.5" /> Settled
                                                            </div>
                                                            <p className="text-[9px] text-muted-foreground">{formatDate(refund.refund_settled_at)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">
                        Showing <span className="text-foreground">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-foreground font-bold">{pagination.total}</span> records
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            className="h-9 px-4 rounded-xl border-border/50"
                        >
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {[...Array(pagination.totalPages)].map((_, i) => (
                                <Button
                                    key={i}
                                    variant={pagination.page === i + 1 ? "default" : "ghost"}
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-[11px] font-bold"
                                    onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}
                                >
                                    {i + 1}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            className="h-9 px-4 rounded-xl border-border/50"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Help Card */}
            <div className="grid md:grid-cols-2 gap-6 mt-12 mb-20">
                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-foreground text-sm">Escrow Timeline</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Cancellations trigger immediate refunds. Returns trigger refunds only after the item reaches <b>RTO_COMPLETED</b> (Confirmed Warehouse Receipt).
                        </p>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-secondary/20 border border-border/50 flex gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center shrink-0">
                        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-foreground text-sm">Security & Privacy</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Customer bank details are shown here after being decrypted on-the-fly. They are stored encrypted (AES-256) in the core database for compliance.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShieldAlert({ className }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
        </svg>
    )
}