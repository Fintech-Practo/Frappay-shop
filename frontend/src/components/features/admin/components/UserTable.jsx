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
import { Input } from '@/components/ui/input';
import { Search, Ban, CheckCircle, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/admin.service';
import AdminPagination from './AdminPagination';
import { formatDate } from '@/lib/utils';

export default function UserTable() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers(currentPage, itemsPerPage, search);
    }, [currentPage, itemsPerPage]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                loadUsers(1, itemsPerPage, search);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    async function loadUsers(page, limit, searchTerm) {
        try {
            setLoading(true);
            setError(null);
            const res = await adminService.getAllUsers(page, limit, {
                search: searchTerm,
                role: 'USER'
            });

            if (res.success && res.data) {
                // Backend returns { users, total } in res.data
                const { users, total } = res.data;
                setUsers(users || []);
                setTotalItems(total || 0);
                setTotalPages(Math.ceil((total || 0) / limit));
            } else {
                setUsers([]);
                setTotalItems(0);
                setTotalPages(1);
                console.warn("Unexpected response format:", res);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load users. Please try again.");
            setUsers([]);
            setTotalItems(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }

    async function handleBlock(userId) {
        const reason = prompt('Please enter a reason for blocking this user (minimum 5 characters):');
        if (!reason || reason.trim().length < 5) {
            alert('Reason must be at least 5 characters long.');
            return;
        }
        try {
            await adminService.blockUser(userId, reason.trim());
            loadUsers(currentPage, itemsPerPage, search);
        } catch (err) {
            console.error('Failed to block user:', err);
            alert('Failed to block user: ' + (err.response?.data?.message || err.message));
        }
    }

    async function handleUnblock(userId) {
        const reason = prompt('Please enter a reason for enabling this user (minimum 5 characters):');
        if (!reason || reason.trim().length < 5) {
            alert('Reason must be at least 5 characters long.');
            return;
        }
        try {
            await adminService.enableUser(userId, reason.trim());
            loadUsers(currentPage, itemsPerPage, search);
        } catch (err) {
            console.error('Failed to enable user:', err);
            alert('Failed to enable user: ' + (err.response?.data?.message || err.message));
        }
    }

    function handleViewDetails(userId) {
        navigate(`/admin/users/${userId}/details`);
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Users Management</h2>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-red-500">{error}</TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">No users found</TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'SELLER' ? 'secondary' : 'outline'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={user.is_active ? 'bg-primary/10 text-foreground' : 'bg-accent text-foreground'}>
                                            {user.is_active ? 'Active' : 'Disabled'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(user.created_at)}</TableCell>
                                    <TableCell>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetails(user.id)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" /> View
                                            </Button>
                                            {!user.is_active && user.role !== 'ADMIN' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => handleUnblock(user.id)}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" /> Enable
                                                </Button>
                                            ) : user.is_active && user.role !== 'ADMIN' ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleBlock(user.id)}
                                                >
                                                    <Ban className="h-4 w-4 mr-1" /> Block
                                                </Button>
                                            ) : null}
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
                    Showing {users.length} of {totalItems} users
                </div>
                <AdminPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
