import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getOrderDisplayStatus, STATUS_CONFIG, formatDate } from '@/lib/utils';
import api from '@/config/api';
import {
    Truck, Package, MapPin, Calendar, Search, Filter,
    Eye, Download, RefreshCw, Clock, CheckCircle, XCircle, User, ShieldCheck, Store, Activity, ChevronRight, List
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
import { Separator } from '@/components/ui/separator';

export default function AdminLogistics() {
    const navigate = useNavigate();
    const { toast } = useToast();

    const [shipments, setShipments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [showSimulation, setShowSimulation] = useState(import.meta.env.DEV);
    const [stats, setStats] = useState({
        total: 0,
        ready_to_pack: 0,
        packed: 0,
        in_transit: 0,
        out_for_delivery: 0,
        delivered: 0,
        total_margin: 0
    });

    useEffect(() => {
        fetchShipments();
    }, [statusFilter, page]);

    const handleDownloadLabel = async (orderId) => {
        try {
            const res = await api.get(`/api/logistics/label/${orderId}`);
            
            if (res.status === 200 && res.data?.url) {
                window.open(res.data.url, "_blank");
                return;
            }

            if (res.data?.status === 'processing' || res.data?.status === 'pending') {
                toast({
                    title: 'Processing',
                    description: 'Label is still being generated. Please check back in a moment.'
                });
            }
        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;

            if (status === 202) {
                toast({ title: 'Processing', description: 'Label is still being generated.' });
            } else if (status === 404 && data?.status === 'failed') {
                toast({ title: 'Failed', description: 'Label generation failed.', variant: 'destructive' });
            } else {
                toast({ title: 'Error', description: data?.message || 'Failed to fetch label', variant: 'destructive' });
            }
        }
    };

    const fetchShipments = async () => {
        try {
            setLoading(true);
            const params = {
                role: 'ADMIN',
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
                // calculateStats should probably be based on a separate stats API or all items
                // for now we'll keep it as is, but it only shows stats for the current page
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
            ready_to_pack: data.filter(s => s.admin_status === 'AWB_ASSIGNED').length,
            packed: data.filter(s => s.admin_status === 'PACKED').length,
            in_transit: data.filter(s => ['IN_TRANSIT', 'SHIPPED', 'PICKED_UP'].includes(s.admin_status)).length,
            out_for_delivery: data.filter(s => s.admin_status === 'OUT_FOR_DELIVERY').length,
            delivered: data.filter(s => s.admin_status === 'DELIVERED').length,
            total_margin: data.reduce((sum, s) => sum + (parseFloat(s.shipping_margin) || 0), 0)
        });
    };

    // const renderStatusBadge = (shipment) => {
    //     // Construct an order object similar to what findById returns
    //     const order = {
    //         status: shipment.order_status || shipment.admin_status,
    //         shipments: [shipment]
    //     };
    //     const displayStatus = getOrderDisplayStatus(order);
    //     const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.UNKNOWN;

    //     return (
    //         <Badge className={cn("px-2.5 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap", config.color)}>
    //             {config.label}
    //         </Badge>
    //     );
    // };
    const renderStatusBadge = (shipment) => {
        const order = {
            status: shipment.order_status || shipment.admin_status,
            shipments: [shipment]
        };

        const displayStatus = getOrderDisplayStatus(order);
        const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.UNKNOWN;

        return (
            <Badge className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-foreground border border-primary/20">
                {config.label}
            </Badge>
        );
    };
    const filteredShipments = shipments.filter(shipment => {
        const matchesSearch = searchTerm === '' ||
            shipment.order_id?.toString().includes(searchTerm) ||
            shipment.awb_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shipment.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shipment.seller_name?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(price || 0);
    };

    const handleSimulateStatus = async (shipmentId, status, awb) => {
        try {
            const res = await api.post('/api/logistics/simulate-status', {
                shipmentId,
                status,
                awb
            });

            if (res.data.success) {
                toast({
                    title: 'Status Updated',
                    description: `Shipment moved to ${status}`
                });
                fetchShipments();
            }
        } catch (error) {
            console.error('Failed to simulate status:', error);
            toast({
                title: 'Simulation Failed',
                description: error.response?.data?.message || 'Error communicating with server',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="min-h-screen bg-background py-8 w-full max-w-full overflow-x-hidden">
            <div className="w-full max-w-7xl mx-auto px-4 md:px-6 ">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2 text-foreground">
                            <Truck className="h-8 w-8 text-primary" />
                            Logistics Management
                        </h1>
                        <p className="text-muted-foreground">
                            Manage all shipments and tracking details across all sellers
                        </p>
                    </div>
                    <div>
                        <Button
                            variant={showSimulation ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-[10px] gap-2"
                            onClick={() => setShowSimulation(!showSimulation)}
                        >
                            <Activity className="h-3.5 w-3.5" />
                            {showSimulation ? "Simulation Enabled" : "Enable Simulation"}
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Ready to Pack</p>
                            <p className="text-xl font-bold">{stats.ready_to_pack}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Packed</p>
                            <p className="text-xl font-bold">{stats.packed}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">In Transit</p>
                            <p className="text-xl font-bold">{stats.in_transit}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Out for Delivery</p>
                            <p className="text-xl font-bold">{stats.out_for_delivery}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                            <p className="text-xl font-bold text-green-500 dark:text-green-400">{stats.delivered}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4">
                            <p className="text-xs text-primary font-bold mb-1">Net Margin</p>
                            <p className="text-xl font-bold text-primary">{formatPrice(stats.total_margin)}</p>
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
                                        placeholder="Search by Order ID, AWB, Email, or Seller..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[220px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="AWB_ASSIGNED">Ready to Pack</SelectItem>
                                    <SelectItem value="PACKED">Packed (Waiting Pickup)</SelectItem>
                                    <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                                    <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
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
                        <CardTitle>All Shipments</CardTitle>
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
                                <p className="text-lg font-medium mb-2 text-foreground">No shipments found</p>
                                <p className="text-muted-foreground">
                                    {searchTerm || statusFilter !== 'ALL'
                                        ? 'Try adjusting your filters'
                                        : 'Shipments will appear here once orders are packed'
                                    }
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="w-full overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="border-b border-border">
                                            <tr className="text-left text-sm text-muted-foreground">
                                                <th className="pb-3 font-medium">Order & Seller</th>
                                                <th className="pb-3 font-medium">Courier & AWB</th>
                                                <th className="pb-3 font-medium">Status</th>
                                                <th className="pb-3 font-medium">COD Amount</th>
                                                <th className="pb-3 font-medium">Pickup/Delivery Info</th>
                                                <th className="pb-3 font-medium w-[180px]">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredShipments.map((shipment) => (
                                                <tr key={shipment.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                                                    <td className="py-4 align-top break-words">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold">#{shipment.order_id}</p>
                                                                {shipment.order_type && (
                                                                    <Badge variant="outline" className="text-[10px] h-4">
                                                                        {shipment.order_type}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                <Store className="h-3 w-3" />
                                                                <span>{shipment.seller_name || 'N/A'}</span>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground">{shipment.buyer_email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 align-top break-words">
                                                        <div className="space-y-1">
                                                            <p className="text-xs font-medium">{shipment.courier_name || 'Pending'}</p>
                                                            <div className="font-mono text-xs text-muted-foreground">

                                                                {shipment.awb_code || 'Pending'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 align-top break-words">
                                                        {renderStatusBadge(shipment)}
                                                    </td>
                                                    <td className="py-4 align-top break-words">
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-bold">
                                                                {shipment.cod_amount && shipment.cod_amount > 0
                                                                    ? formatPrice(shipment.cod_amount)
                                                                    : '₹0'}
                                                            </p>
                                                            {shipment.cod_amount > 0 && (
                                                                <p className="text-[10px] text-primary font-medium">
                                                                    COD to collect
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 align-top break-words">
                                                        <div className="text-xs space-y-1">
                                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>Est: {shipment.estimated_delivery_days || '3-5 days'}</span>
                                                            </div>
                                                            {shipment.packed_at && (
                                                                <p className="text-[10px]">Packed: {formatDate(shipment.packed_at)}</p>
                                                            )}
                                                            {shipment.delivered_date && (
                                                                <p className="text-[10px] text-green-500 dark:text-green-400 font-bold uppercase">Delivered: {formatDate(shipment.delivered_date)}</p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 align-top break-words">
                                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => navigate(`/admin/orders/${shipment.order_id}/details`)}
                                                                title="View Order Details"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setSelectedHistory(shipment)}
                                                                title="View Tracking History"
                                                            >
                                                                <List className="h-3 w-3" />
                                                            </Button>

                                                            {/* Simulation Action */}
                                                            {showSimulation && (
                                                                <Select onValueChange={(val) => handleSimulateStatus(shipment.id, val, shipment.awb_code)}>
                                                                    <SelectTrigger className="h-7 w-[110px] text-[10px] bg-muted/50 border-border">
                                                                        <SelectValue placeholder="Simulate" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[9999]">
                                                                        <SelectItem value="PACKED">Packed</SelectItem>
                                                                        <SelectItem value="AWB_ASSIGNED">AWB Assigned</SelectItem>
                                                                        <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                                                                        <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                                                                        <SelectItem value="OUT_FOR_DELIVERY">Out for Delivery</SelectItem>
                                                                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                                                                        <SelectItem value="RTO_INITIATED">RTO Initiated</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDownloadLabel(shipment.order_id)}
                                                                title="Download Shipping Label"
                                                            >
                                                                <Download className={cn("h-3 w-3", shipment.label_status === 'ready' ? "text-primary" : "text-muted-foreground")} />
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
                                                                    title="Track Shipment"
                                                                >
                                                                    <Truck className="h-3 w-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between mt-6 px-2">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} shipments
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                                disabled={page === 1 || loading}
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
                                                disabled={page === totalPages || loading}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
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
                                                {formatDate(h.activity_date)} {new Date(h.activity_date).toLocaleTimeString()}
                                            </p>
                                            {h.description && <p className="text-[10px] italic mt-1">{h.description}</p>}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 opacity-50">
                                    <Clock className="h-8 w-8 mx-auto mb-2" />
                                    <p>No activity recorded yet</p>
                                </div>
                            )}
                        </div>
                        <Button onClick={() => setSelectedHistory(null)} className="w-full">Close</Button>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}