import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import adminService from '../services/admin.service';
import SellerOnboardingDetailsModal from './SellerOnboardingDetailsModal';
import AdminPagination from './AdminPagination';

export default function SellerTable() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('active');
    const [pendingSellers, setPendingSellers] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedSellerId, setSelectedSellerId] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        setCurrentPage(1); // Reset page on tab change
    }, [activeTab]);

    useEffect(() => {
        loadData(currentPage);
    }, [activeTab, currentPage]);

    async function loadData(page) {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'active') {
                const res = await adminService.getAllUsers(page, itemsPerPage, { role: 'SELLER' });

                if (res.success && res.data) {
                    const { users, total } = res.data;
                    setSellers(users || []);
                    setTotalItems(total || 0);
                    setTotalPages(Math.ceil((total || 0) / itemsPerPage));
                } else {
                    setSellers([]);
                    setTotalItems(0);
                    setTotalPages(1);
                }
            } else {
                const res = await adminService.getPendingOnboarding(page, itemsPerPage);

                if (res.pendingRequests) {
                    setPendingSellers(res.pendingRequests);
                    setTotalItems(res.totalItems || 0);
                    setTotalPages(res.totalPages || 1);
                } else if (res.success && res.data) {
                    // Support legacy response format if any
                    setPendingSellers(Array.isArray(res.data) ? res.data : (res.data.pendingRequests || []));
                    setTotalItems(res.data.totalItems || (Array.isArray(res.data) ? res.data.length : 0));
                    setTotalPages(res.data.totalPages || 1);
                } else {
                    setPendingSellers([]);
                    setTotalItems(0);
                    setTotalPages(1);
                }
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load data");
            setSellers([]);
            setPendingSellers([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(id) {
        try {
            await adminService.approveOnboarding(id);
            loadData(currentPage);
        } catch (err) {
            alert("Failed to approve");
        }
    }

    async function handleReject(id) {
        if (!confirm("Reject application?")) return;
        try {
            await adminService.rejectOnboarding(id, "Rejected by admin");
            loadData(currentPage);
        } catch (err) {
            alert("Failed to reject");
        }
    }

    const currentList = activeTab === 'active' ? sellers : pendingSellers;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Seller Management</h2>
            </div>

            <div className="flex space-x-2 border-b">
                <button
                    className={`px-4 py-2 transition-colors ${activeTab === 'active' ? 'border-b-2 border-primary text-primary font-bold' : 'text-muted-foreground hover:text-primary'}`}
                    onClick={() => setActiveTab('active')}
                >
                    Active Sellers
                </button>
                <button
                    className={`px-4 py-2 transition-colors ${activeTab === 'pending' ? 'border-b-2 border-primary text-primary font-bold' : 'text-muted-foreground hover:text-primary'}`}
                    onClick={() => setActiveTab('pending')}
                >
                    Pending Approvals
                </button>
            </div>

            <div className="border rounded-lg overflow-hidden bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Store / User</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground italic">
                                    Loading {activeTab} sellers...
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-destructive">
                                    {error}
                                </TableCell>
                            </TableRow>
                        ) : currentList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                    No {activeTab} sellers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            currentList.map((item) => (
                                <TableRow key={item.id || item.user_id}>
                                    <TableCell className="font-medium">
                                        <div>
                                            <p className="font-semibold">{item.business_name || item.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">ID: {item.id || item.user_id}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm space-y-0.5">
                                            {activeTab === 'pending' && item.business_location && (
                                                <p className="text-muted-foreground flex items-center gap-1">
                                                    <span className="opacity-70">Loc:</span> {item.business_location}
                                                </p>
                                            )}
                                            <p className="font-mono text-xs">{item.email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={activeTab === 'active' ? (item.is_active ? 'success' : 'destructive') : 'warning'}>
                                            {activeTab === 'active' ? (item.is_active ? 'Active' : 'Suspended') : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {activeTab === 'active' ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => navigate(`/admin/sellers/${item.id || item.user_id}/details`)}
                                            >
                                                Details
                                            </Button>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setSelectedSellerId(item.user_id);
                                                        setDetailsModalOpen(true);
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                                <Button size="sm" onClick={() => handleApprove(item.user_id)} className="bg-green-600 hover:bg-green-700">Approve</Button>
                                                <Button size="sm" variant="destructive" onClick={() => handleReject(item.user_id)}>Reject</Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">
                    Showing {currentList.length} of {totalItems} items
                </div>
                <AdminPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>

            <SellerOnboardingDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                userId={selectedSellerId}
                onApprove={() => loadData(currentPage)}
                onReject={() => loadData(currentPage)}
            />
        </div>
    );
}