import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    cn, getOrderDisplayStatus, STATUS_CONFIG, formatDate
} from '@/lib/utils';
import api from '@/config/api';
import {
    Truck, Package, MapPin, Calendar, Search, Filter,
    Eye, Download, RefreshCw, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import AdminPagination from '@/components/features/admin/components/AdminPagination';

export default function SellerLogistics() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        in_transit: 0,
        delivered: 0
    });

    useEffect(() => {
        fetchShipments();
    }, [statusFilter, page]);

    const handleDownloadLabel = async (orderId) => {
        try {
            const res = await api.get(`/api/logistics/label/${orderId}`);

            if (res.status === 200 && res.data?.url) {
                // ✅ Open the S3 PDF directly — no CORS issue
                window.open(res.data.url, "_blank");
                return;
            }

            if (res.data?.status === 'processing' || res.data?.status === 'pending') {
                toast({
                    title: 'Processing',
                    description: 'Label is being generated. Please try again in a moment.',
                });
                return;
            }

        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;

            if (status === 202) {
                toast({ title: 'Processing', description: 'Label is still being generated.' });
            } else if (status === 404 && data?.status === 'failed') {
                toast({ title: 'Label Failed', description: 'Use Retry Label to regenerate.', variant: 'destructive' });
            } else {
                toast({
                    title: 'Error',
                    description: data?.message || 'Failed to fetch label',
                    variant: 'destructive'
                });
            }
        }
    };

    const fetchShipments = async () => {
        try {
            setLoading(true);
            const params = {
                role: 'SELLER',
                includeHistory: 'true',
                page,
                limit
            };

            if (statusFilter !== 'ALL') {
                params.status = statusFilter;
            }

            const res = await api.get('/api/logistics/list', { params });

            if (res.data.success) {
                setShipments(res.data.data || []);
                if (res.data.pagination) {
                    setTotalPages(res.data.pagination.totalPages || 1);
                    setTotalItems(res.data.pagination.totalItems || 0);
                }
                calculateStats(res.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch shipments:', error);
            toast({
                title: 'Error',
                description: 'Failed to load shipments',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        setStats({
            total: data.length,
            pending: data.filter(s => s.admin_status === 'CREATED' || s.admin_status === 'AWB_ASSIGNED').length,
            in_transit: data.filter(s => s.admin_status === 'SHIPPED' || s.admin_status === 'IN_TRANSIT').length,
            delivered: data.filter(s => s.admin_status === 'DELIVERED').length
        });
    };

    const renderStatusBadge = (shipment) => {
        // Construct an order object
        const order = {
            status: shipment.order_status || shipment.admin_status,
            shipments: [shipment]
        };
        const displayStatus = getOrderDisplayStatus(order);
        const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.UNKNOWN;

        return (
            <Badge className={cn("px-2.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap", config.color)}>
                {config.label}
            </Badge>
        );
    };

    const filteredShipments = shipments.filter(shipment => {
        const matchesSearch = searchTerm === '' ||
            shipment.order_id.toString().includes(searchTerm) ||
            shipment.awb_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shipment.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(price || 0);
    };

    return (
        <div className="w-full overflow-x-hidden">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                    <Truck className="h-8 w-8 text-primary" />
                    Logistics & Shipments
                </h1>
                <p className="text-muted-foreground">
                    Manage all your order shipments and tracking details
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Total Shipments</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <Package className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Pending Pickup</p>
                                <p className="text-2xl font-bold">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-accent" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">In Transit</p>
                                <p className="text-2xl font-bold">{stats.in_transit}</p>
                            </div>
                            <Truck className="h-8 w-8 text-primary" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Delivered</p>
                                <p className="text-2xl font-bold">{stats.delivered}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by Order ID, AWB, or Email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="CREATED">Created</SelectItem>
                                <SelectItem value="AWB_ASSIGNED">AWB Assigned</SelectItem>
                                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                                <SelectItem value="DELIVERED">Delivered</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button onClick={fetchShipments} variant="outline">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Shipments Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Shipment Details</CardTitle>
                    <CardDescription>
                        {filteredShipments.length} shipment(s) found
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Loading shipments...</p>
                        </div>
                    ) : filteredShipments.length === 0 ? (
                        <div className="text-center py-12">
                            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium mb-2">No shipments found</p>
                            <p className="text-muted-foreground">
                                {searchTerm || statusFilter !== 'ALL'
                                    ? 'Try adjusting your filters'
                                    : 'Shipments will appear here once orders are packed'
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="w-full max-w-fulloverflow-x-auto">
                                <table className="w-full min-w-[900px]">
                                    <thead className="border-b border-border">
                                        <tr className="text-left text-sm text-muted-foreground">
                                            <th className="pb-3 font-medium">Order</th>
                                            <th className="pb-3 font-medium">Buyer</th>
                                            <th className="pb-3 font-medium">Courier</th>
                                            <th className="pb-3 font-medium">AWB</th>
                                            <th className="pb-3 font-medium">Status</th>
                                            <th className="pb-3 font-medium">Shipping Cost</th>
                                            <th className="pb-3 font-medium">Est. Delivery</th>
                                            <th className="pb-3 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredShipments.map((shipment) => (
                                            <tr key={shipment.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                                                <td className="py-4">
                                                    <div>
                                                        <p className="font-medium">#{shipment.order_id}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatPrice(shipment.total_payable_amount || shipment.total_amount)}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <p className="text-sm">{shipment.buyer_email || 'N/A'}</p>
                                                </td>
                                                <td className="py-4">
                                                    <p className="text-sm font-medium">{shipment.courier_name || 'Pending'}</p>
                                                </td>
                                                <td className="py-4">
                                                    <p className="font-mono text-xs">{shipment.awb_code || 'Pending'}</p>
                                                </td>
                                                <td className="py-4">
                                                    {renderStatusBadge(shipment)}
                                                </td>
                                                <td className="py-4">
                                                    <p className="text-sm font-medium">{formatPrice(shipment.actual_shipping_cost)}</p>
                                                </td>
                                                <td className="py-4">
                                                    <p className="text-sm">
                                                        {shipment.estimated_delivery_date
                                                            ? formatDate(shipment.estimated_delivery_date)
                                                            : (shipment.estimated_delivery_days || '-')
                                                        }
                                                    </p>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => navigate(`/seller/orders/${shipment.order_id}`)}
                                                            title="View Order Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setSelectedHistory(shipment)}
                                                            title="View Tracking History"
                                                        >
                                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M2.5 4.5V4C2.5 3.72386 2.72386 3.5 3 3.5H12C12.2761 3.5 12.5 3.72386 12.5 4V4.5H2.5ZM2.5 5.5H12.5V11C12.5 11.2761 12.2761 11.5 12 11.5H3C2.72386 11.5 2.5 11.2761 2.5 11V5.5ZM1.5 4C1.5 3.17157 2.17157 2.5 3 2.5H12C12.8284 2.5 13.5 3.17157 13.5 4V11C13.5 11.8284 12.8284 12.5 12 12.5H3C2.17157 12.5 1.5 11.8284 1.5 11V4ZM6.5 7.5H8.5V8.5H6.5V7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>

                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDownloadLabel(shipment.order_id)}
                                                            title="Download Shipping Label"
                                                            disabled={shipment.label_status === 'failed'}
                                                        >
                                                            {shipment.label_status === 'processing' ? (
                                                                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                                                            ) : (
                                                                <Download className={cn("h-4 w-4", shipment.label_status === 'ready' ? "text-primary" : "text-muted-foreground")} />
                                                            )}
                                                        </Button>

                                                        {shipment.tracking_url && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    let url = shipment.tracking_url;
                                                                    if (!url) return;
                                                                    if (url.includes('undefined') || url.includes('null') || !url.startsWith('http')) {
                                                                        const awb = shipment.awb_code || url.replace('undefined', '').replace('null', '').replace('https://', '').replace('http://', '');
                                                                        url = `https://www.delhivery.com/track/package/${awb}`;
                                                                    }
                                                                    window.open(url, '_blank');
                                                                }}
                                                            >
                                                                <Truck className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between items-center mt-6">
                                <div className="text-sm text-muted-foreground">
                                    Showing {shipments.length} of {totalItems} shipments
                                </div>
                                <AdminPagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Tracking History Dialog */}
            <Dialog open={!!selectedHistory} onOpenChange={(open) => !open && setSelectedHistory(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tracking History</DialogTitle>
                        <DialogDescription>
                            Shipment AWB: {selectedHistory?.awb_code || 'N/A'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 my-4 max-h-[400px] overflow-y-auto pr-2">
                        {selectedHistory?.tracking_history && selectedHistory.tracking_history.length > 0 ? (
                            selectedHistory.tracking_history.map((h, i) => (
                                <div key={i} className="relative pl-6 pb-4 last:pb-0">
                                    {i < selectedHistory.tracking_history.length - 1 && (
                                        <div className="absolute left-[7px] top-[14px] bottom-0 w-[2px] bg-secondary" />
                                    )}
                                    <div className="absolute left-0 top-[6px] h-[16px] w-[16px] rounded-full bg-primary flex items-center justify-center">
                                        <div className="h-2 w-2 rounded-full bg-background" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold uppercase">{h.status?.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-muted-foreground">{h.location || 'N/A'}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {new Date(h.activity_date).toLocaleString()}
                                        </p>
                                        {h.description && <p className="text-[10px] italic mt-1">{h.description}</p>}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 opacity-50">
                                <Clock className="h-8 w-8 mx-auto mb-2" />
                                <p>No tracking updates available yet.</p>
                            </div>
                        )}
                    </div>
                    <Button onClick={() => setSelectedHistory(null)} className="w-full">Close</Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}