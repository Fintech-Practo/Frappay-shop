import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/config/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Plus, Search, Edit, Trash2, BarChart2, MoreHorizontal,
    ArrowLeft, Archive, AlertCircle, Eye, Loader2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminPagination from '@/components/features/admin/components/AdminPagination';


export default function SellerProducts() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [paginationData, setPaginationData] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });

    // Fetch products with server-side pagination and search
    const fetchProducts = async (page = currentPage, searchQuery = search) => {
        setLoading(true);
        try {
            const res = await api.get('/api/products/my/products', {
                params: {
                    page,
                    limit: itemsPerPage,
                    search: searchQuery
                }
            });
            if (res.data.success) {
                const data = res.data.data;
                setProducts(data?.products || (Array.isArray(data) ? data : []));
                if (data?.pagination) {
                    setPaginationData(data.pagination);
                }
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load products",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Initial load and search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                fetchProducts(1, search);
            }
        }, search ? 500 : 0);
        return () => clearTimeout(timer);
    }, [search]);

    // Page change trigger
    useEffect(() => {
        fetchProducts(currentPage, search);
    }, [currentPage]);

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const res = await api.delete(`/api/products/${deleteId}`);
            if (res.data.success) {
                toast({ title: "Success", description: "Product deleted successfully" });
                fetchProducts();
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to delete product",
                variant: "destructive"
            });
        } finally {
            setDeleteId(null);
        }
    };

    // Reset to page 1 when search changes
    // This is now handled by the search useEffect above
    /*
    useEffect(() => {
        setCurrentPage(1);
    }, [search]);
    */

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price);
    };

    const getStatusBadge = (product) => {
        const { stock, is_active, format, is_unlimited_stock } = product;
        if (!is_active) return <Badge variant="secondary">Inactive</Badge>;
        if (format?.toLowerCase() === 'ebook' || is_unlimited_stock) return <Badge className="bg-green-600 hover:bg-green-700">Digital / Unlimited</Badge>;
        if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
        if (stock < 10) return <Badge className="bg-amber-500 hover:bg-amber-600">Low Stock</Badge>;
        return <Badge className="bg-green-600 hover:bg-green-700">In Stock</Badge>;
    };
    return (
        <>
            <div className="w-full">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>

                        <h1 className="text-3xl font-bold font-display tracking-tight">Product Inventory</h1>
                        <p className="text-muted-foreground">Manage your catalog, stock, and pricing</p>
                    </div>
                    <Button onClick={() => navigate('/seller/products/add')} className="shadow-lg shadow-primary/20">
                        <Plus className="h-4 w-4 mr-2" /> Add New Product
                    </Button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by title or SKU..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Products Table */}
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary/30">
                                <TableHead className="w-[80px]">Image</TableHead>
                                <TableHead>Product Details</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Pricing</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                        <span className="text-sm text-muted-foreground mt-2 block">Loading inventory...</span>
                                    </TableCell>
                                </TableRow>
                            ) : products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Archive className="h-10 w-10 mb-2 opacity-20" />
                                            <p>No products found.</p>
                                            {search && <Button variant="link" onClick={() => setSearch('')}>Clear search</Button>}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow key={product.id} className="group">
                                        <TableCell>
                                            <div className="h-12 w-12 rounded-md bg-secondary overflow-hidden border">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.title}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center bg-secondary text-secondary-foreground">
                                                        <span className="text-xs font-bold">img</span>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-foreground max-w-[250px] truncate" title={product.title}>
                                                {product.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                SKU: {product.sku || 'N/A'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal text-muted-foreground">
                                                {product.format}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-foreground">{formatPrice(product.selling_price)}</div>
                                            {product.mrp > product.selling_price && (
                                                <div className="text-xs text-muted-foreground line-through">
                                                    {formatPrice(product.mrp)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                {getStatusBadge(product.stock, product.is_active)}
                                                <span className="text-xs text-muted-foreground">{product.stock} units</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end"
                                                    className="bg-secondary/95  backdrop-blur border shadow-lg rounded-md ">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigate(`/product/${product.id}`)}>
                                                        <Eye className="h-4 w-4 mr-2" /> View Listing
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/seller/products/${product.id}/edit`)}> {/* Assuming edit route exists or will exist */}
                                                        <Edit className="h-4 w-4 mr-2" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/seller/products/${product.id}/analytics`)}>
                                                        <BarChart2 className="h-4 w-4 mr-2 text-primary" /> View Analytics
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setDeleteId(product.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete Product
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {products.length > 0 && (
                        <div className="flex justify-between items-center mt-6 pt-4 border-t bg-card px-4 py-4 rounded-b-lg">
                            <div className="text-sm text-muted-foreground">
                                Showing {products.length} of {paginationData.total} products
                            </div>
                            {paginationData.totalPages > 1 && (
                                <AdminPagination
                                    currentPage={currentPage}
                                    totalPages={paginationData.totalPages}
                                    onPageChange={setCurrentPage}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the product from your inventory and remove it from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}