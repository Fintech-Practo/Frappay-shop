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
import { adminService } from "@/index";
import { AlertTriangle } from 'lucide-react';

export default function InventoryLowStock() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBooks();
    }, []);

    async function loadBooks() {
        try {
            setLoading(true);
            const res = await adminService.getLowStockBooks(10); // Default threshold
            // Handle both response formats: direct array or wrapped in data property
            const booksData = Array.isArray(res) ? res : (res.data || []);
            setBooks(booksData);
        } catch (err) {
            console.error('Failed to load low stock books:', err);
            setBooks([]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <AlertTriangle className="text-accent h-5 w-5" />
                    Low Stock Inventory
                </h2>
            </div>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Book Title</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead>Stock Level</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">Loading...</TableCell>
                            </TableRow>
                        ) : books.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No low stock items found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            books.map((book) => (
                                <TableRow key={book.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {book.image_url && (
                                                <img src={book.image_url} alt="" className="w-8 h-10 object-cover rounded" />
                                            )}
                                            <span>{book.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{book.seller_name || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant="destructive">{book.stock} left</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-muted-foreground">Restock advised</span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
