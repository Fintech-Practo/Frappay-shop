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
import { Eye, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/admin.service';
import AdminPagination from './AdminPagination';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

export default function OrderTable() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [statusFilter, setStatusFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadOrders(currentPage, itemsPerPage, statusFilter);
    }, [currentPage, itemsPerPage, statusFilter]);

    async function loadOrders(page, limit, status) {
        try {
            setLoading(true);
            const filters = {};
            if (status && status !== 'ALL') filters.status = status;

            const res = await adminService.getAllOrders(page, limit, filters);

            // Backend returns { orders, total } if successful
            if (res.orders) {
                setOrders(res.orders);
                setTotalItems(res.total || 0);
                setTotalPages(Math.ceil((res.total || 0) / limit));
            } else if (Array.isArray(res)) {
                // Handle fallback or direct array response
                setOrders(res);
                setTotalItems(res.length);
                setTotalPages(Math.ceil(res.length / limit));
            } else {
                setOrders([]);
                setTotalItems(0);
                setTotalPages(1);
            }
        } catch (err) {
            console.error(err);
            setOrders([]);
            setTotalItems(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }

    async function handleStatusChange(id, newStatus) {
        try {
            await adminService.updateOrderStatus(id, newStatus);
            loadOrders(currentPage, itemsPerPage, statusFilter); // Refresh
        } catch (err) {
            alert('Failed to update order status');
        }
    }

    function handleViewDetails(orderId) {
        navigate(`/admin/orders/${orderId}/details`);
    }

    const getBadgeVariant = (s) => {
        switch (s) {
            case 'DELIVERED': return 'bg-green-100 text-green-800';
            case 'READY_TO_SHIP': return 'bg-blue-100 text-blue-800';
            case 'PACKED': return 'bg-blue-100 text-blue-800';
            case 'SHIPPED': return 'bg-blue-100 text-blue-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'AWB_ASSIGNED': return 'bg-blue-100 text-blue-800';
            case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-4  overflow-x-hidden md:overflow-visible">
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 mt-4">
                <h2 className="text-xl font-bold">All Orders</h2>
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="max-w-[95vw] md:max-w-none">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PACKED">Packed</SelectItem>
                            <SelectItem value="READY_TO_SHIP">Ready to Ship</SelectItem>
                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                            <SelectItem value="AWB_ASSIGNED">AWB Assigned</SelectItem>
                            <SelectItem value="SHIPPED">Shipped</SelectItem>
                            <SelectItem value="DELIVERED">Delivered</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => loadOrders(currentPage, itemsPerPage, statusFilter)} variant="outline" size="sm">Refresh</Button>
                </div>
            </div>

            <div className="border rounded-lg overflow-x-auto md:overflow-visible">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading orders...</TableCell>
                            </TableRow>
                        ) : orders.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">No orders found</TableCell>
                            </TableRow>
                        ) : (
                            orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">#{order.id}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{order.user_name}</p>
                                            <p className="text-xs text-muted-foreground">{order.user_email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatDate(order.created_at)}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">₹{order.grand_total || order.total_amount}</p>
                                            <p className="text-xs text-muted-foreground">Incl. ₹{order.shipping_cost || 0} Ship</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getBadgeVariant(order.status)} variant="outline">
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetails(order.id)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" /> View
                                            </Button>
                                            <Select onValueChange={(val) => handleStatusChange(order.id, val)} defaultValue={order.status}>
                                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PENDING">Pending</SelectItem>
                                                    <SelectItem value="PACKED">Packed</SelectItem>
                                                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                                    <SelectItem value="AWB_ASSIGNED">AWB Assigned</SelectItem>
                                                    <SelectItem value="READY_TO_SHIP">Ready to Ship</SelectItem>
                                                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                                                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                    Showing {orders.length} of {totalItems} orders
                </div>
                <div className="w-full md:w-auto overflow-x-auto">
                    <AdminPagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
        </div >
    );
}