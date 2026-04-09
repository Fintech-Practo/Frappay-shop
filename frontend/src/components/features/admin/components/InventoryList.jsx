import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Search, Eye, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import adminService from '../services/admin.service';
import AdminPagination from './AdminPagination';

export default function InventoryList() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        loadBooks(currentPage, itemsPerPage, search);
    }, [currentPage, itemsPerPage]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                loadBooks(1, itemsPerPage, search);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    async function loadBooks(page, limit, searchTerm) {
        try {
            setLoading(true);
            const res = await adminService.getAllBooks(page, limit, {
                search: searchTerm,
                show_all: true // Admin should see all products
            });

            if (res.products && res.pagination) {
                setBooks(res.products);
                setTotalItems(res.pagination.total);
                setTotalPages(res.pagination.totalPages);
            } else if (Array.isArray(res)) {
                setBooks(res);
                setTotalItems(res.length);
                setTotalPages(Math.ceil(res.length / limit));
            } else {
                setBooks([]);
                setTotalItems(0);
                setTotalPages(1);
            }
        } catch (err) {
            console.error('Failed to load books:', err);
            setBooks([]);
            setTotalItems(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }

    function handleViewDetails(productId) {
        navigate(`/admin/inventory/${productId}`);
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Full Inventory
                </h2>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search title, author, isbn..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && books.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">Loading inventory...</TableCell>
                            </TableRow>
                        ) : books.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">No books found.</TableCell>
                            </TableRow>
                        ) : (
                            books.map((book) => (
                                <TableRow key={book.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {book.image_url && <img src={book.image_url} className="w-8 h-10 object-cover rounded" alt="" />}
                                            <div className="flex flex-col">
                                                <span className="truncate max-w-[200px] font-semibold" title={book.title}>{book.title}</span>
                                                {book.attributes?.author && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">By {book.attributes.author}</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{book.seller_name}</span>
                                    </TableCell>
                                    <TableCell>₹{book.selling_price}</TableCell>
                                    <TableCell>
                                        <Badge variant={book.stock < 10 ? 'destructive' : 'secondary'}>
                                            {book.stock}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={book.is_active ? 'outline' : 'secondary'} className={book.is_active ? 'border-border bg-primary/10 text-foreground' : 'bg-gray-100 text-gray-600'}>
                                            {book.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewDetails(book.id)}
                                        >
                                            <Eye className="h-4 w-4 mr-1" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                    Showing {books.length} of {totalItems} items
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
