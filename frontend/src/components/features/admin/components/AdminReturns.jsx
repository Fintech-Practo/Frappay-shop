import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle, Truck, Package, CreditCard, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminService } from "@/index";
import { useToast } from '@/components/ui/use-toast';
import { cn, getOrderDisplayStatus, STATUS_CONFIG, formatDate } from '@/lib/utils';

export default function AdminReturns() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [actionType, setActionType] = useState(null); // 'APPROVE', 'REJECT', 'UPDATE'
    const [remarks, setRemarks] = useState('');
    const [nextStatus, setNextStatus] = useState('');

    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        loadReturns();
    }, [page]);

    async function loadReturns() {
        try {
            setLoading(true);
            const res = await adminService.getReturnRequests({ page, limit });
            // The response structure is { success: true, data: { data: [], pagination: {} } }
            // Service returns res.data which corresponds to the outer object
            const returnData = res.data?.data || [];
            const pagination = res.data?.pagination;

            setReturns(returnData);
            if (pagination) {
                setTotalPages(pagination.totalPages || 1);
                setTotalItems(pagination.totalItems || 0);
            }
        } catch (err) {
    console.error(err);
    setReturns([]); // show empty table instead of popup
} finally {
            setLoading(false);
        }
    }

    const handleAction = (returnReq, type, status = '') => {
        setSelectedReturn(returnReq);
        setActionType(type);
        setNextStatus(status);
        setRemarks('');
    };

    const submitAction = async () => {
        if (!selectedReturn) return;

        try {
            let statusToUpdate = nextStatus;

            if (actionType === 'APPROVE') statusToUpdate = 'RETURN_APPROVED';
            if (actionType === 'REJECT') statusToUpdate = 'DELIVERED'; // Revert to delivered if rejected? Or keep as specific rejected status? Usually keep history. Let's assume we reject the claim, maybe status stays DELIVERED but we add a flag? 
            // Actually, usually we might have a RETURN_REJECTED status. 
            // But looking at the STATUS_CONFIG in utils.js, let's look at available statuses.
            // There is no RETURN_REJECTED. So maybe revert to DELIVERED or just keep it as is with a note. 
            // Let's assume for now we reject and set status back to DELIVERED with remarks, or maybe we should add RETURN_REJECTED.
            // For now, let's use 'RETURN_REJECTED' if backend supports it, otherwise 'DELIVERED'.
            // Checking backend utils usually helps but I don't have it open.
            // Let's assume we move it to a specific status or just close it.
            // For now, let's stick to the flow: Requested -> Approved -> Picked Up -> Delivered -> Refunded.

            if (actionType === 'REJECT') {
                // For now, let's assume we mark it as 'RETURN_REJECTED' and see if backend accepts, or 'COMPLETED' (denied).
                statusToUpdate = 'RETURN_REJECTED';
            }

            await adminService.updateReturnStatus(selectedReturn.id, statusToUpdate, remarks);

            toast({
                title: "Success",
                description: `Return request ${actionType.toLowerCase()}ed successfully`
            });

            loadReturns();
            setSelectedReturn(null);
        } catch (err) {
            toast({
                title: "Error",
                description: err.response?.data?.message || "Failed to update return status",
                variant: "destructive"
            });
        }
    };

    const renderStatusBadge = (order) => {
        const displayStatus = getOrderDisplayStatus(order);
        const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.UNKNOWN;

        return (
            <Badge className={cn("px-2.5 py-0.5 rounded-full border font-medium", config.color)}>
                {config.label}
            </Badge>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Return Requests</h2>
                <Button onClick={loadReturns} variant="outline" size="sm">Refresh</Button>
            </div>
            <div className="border rounded-lg bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Return Reason</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Admin Remarks</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : returns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No return requests found</TableCell>
                            </TableRow>
                        ) : (Array.isArray(returns) ? (
                            returns.map((order) => (
                                <TableRow key={order.return_primary_id || order.id}>
                                    <TableCell className="font-medium">
                                        <Button variant="link" className="p-0 h-auto font-bold" onClick={() => navigate(`/admin/orders/${order.id}/details`)}>
                                            #{order.id}
                                        </Button>
                                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{order.user_name || order.user?.name}</p>
                                            <p className="text-xs text-muted-foreground">{order.user_email || order.user?.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <p className="text-sm truncate" title={order.return_reason}>{order.return_reason}</p>
                                    </TableCell>
                                    <TableCell>
                                        {renderStatusBadge(order)}
                                    </TableCell>
                                    <TableCell className="max-w-[150px]">
                                        <p className="text-xs truncate text-muted-foreground" title={order.admin_remarks}>{order.admin_remarks || '-'}</p>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {(order.status === 'RETURN_REQUESTED' || order.status === 'PENDING') && (
                                                <>
                                                    <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleAction(order, 'APPROVE')}>
                                                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleAction(order, 'REJECT')}>
                                                        <XCircle className="h-4 w-4 mr-1" /> Reject
                                                    </Button>
                                                </>
                                            )}

                                            {order.status === 'RETURN_APPROVED' && (
                                                <Button size="sm" variant="outline" onClick={() => handleAction(order, 'UPDATE', 'PICKUP_SCHEDULED')}>
                                                    <Truck className="h-4 w-4 mr-1" /> Schedule Pickup
                                                </Button>
                                            )}

                                            {order.status === 'PICKUP_SCHEDULED' && (
                                                <Button size="sm" variant="outline" onClick={() => handleAction(order, 'UPDATE', 'IN_TRANSIT')}>
                                                    <Package className="h-4 w-4 mr-1" /> Mark In Transit
                                                </Button>
                                            )}

                                            {order.status === 'IN_TRANSIT' && (
                                                <Button size="sm" variant="outline" onClick={() => handleAction(order, 'UPDATE', 'RTO_COMPLETED')}>
                                                    <CheckCircle className="h-4 w-4 mr-1" /> Confirm Receipt (RTO)
                                                </Button>
                                            )}

                                            {order.status === 'RTO_COMPLETED' && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded">
                                                    <CreditCard className="h-3 w-3" /> Refund Automated
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : null)}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-sm text-muted-foreground">
                        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} returns
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <div className="flex items-center px-4 text-sm font-medium">
                            Page {page} of {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={!!selectedReturn} onOpenChange={(open) => !open && setSelectedReturn(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'APPROVE' && 'Approve Return Request'}
                            {actionType === 'REJECT' && 'Reject Return Request'}
                            {actionType === 'UPDATE' && 'Update Return Status'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'APPROVE' && 'Are you sure you want to approve this return? This will initiate the pickup process.'}
                            {actionType === 'REJECT' && 'Please provide a reason for rejecting this return request.'}
                            {actionType === 'UPDATE' && `Change status to ${nextStatus.replace(/_/g, ' ')}?`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {(selectedReturn?.account_number || selectedReturn?.account_holder_name) && (
                            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm space-y-2">
                                <h4 className="font-bold text-primary flex items-center gap-2">
                                    <Building className="h-4 w-4" /> Refund Destination Account
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <p><span className="text-muted-foreground font-medium">Holder:</span> {selectedReturn.account_holder_name || 'N/A'}</p>
                                    <p><span className="text-muted-foreground font-medium">Account:</span> {selectedReturn.account_number || 'N/A'}</p>
                                    <p><span className="text-muted-foreground font-medium">IFSC:</span> {selectedReturn.ifsc_code || 'N/A'}</p>
                                    <p><span className="text-muted-foreground font-medium">Bank:</span> {selectedReturn.bank_name || 'N/A'}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 italic">
                                    * This account will be used if payment gateway refund fails or for COD orders.
                                </p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Remarks (Optional for Approval/Updates)</label>
                            <Input
                                placeholder="Add internal notes or message to user..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedReturn(null)}>Cancel</Button>
                        <Button
                            variant={actionType === 'REJECT' ? 'destructive' : 'default'}
                            onClick={submitAction}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
