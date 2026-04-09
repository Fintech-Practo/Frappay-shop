import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Trash2, Search, Filter } from 'lucide-react';
import adminService from '../services/admin.service';
import AdminPagination from './AdminPagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/utils';

export default function ReviewModeration() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [ratingFilter, setRatingFilter] = useState('ALL');

    useEffect(() => {
        loadReviews(currentPage, itemsPerPage, search, ratingFilter);
    }, [currentPage, itemsPerPage, ratingFilter]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1);
            } else {
                loadReviews(1, itemsPerPage, search, ratingFilter);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    async function loadReviews(page, limit, searchQuery = '', rating = 'ALL') {
        try {
            setLoading(true);
            setError(null);
            const filters = {};
            if (rating !== 'ALL') filters.rating = rating;

            const res = await adminService.getAllReviews(page, limit, searchQuery, filters);

            if (res.reviews) {
                setReviews(res.reviews);
                setTotalItems(res.totalItems || 0);
                setTotalPages(res.totalPages || 1);
            } else if (res.success && res.data && res.data.reviews) {
                setReviews(res.data.reviews);
                setTotalItems(res.data.totalItems || 0);
                setTotalPages(res.data.totalPages || 1);
            } else if (res.success && res.data && Array.isArray(res.data)) {
                setReviews(res.data);
                setTotalItems(res.totalItems || res.data.length);
                setTotalPages(res.totalPages || 1);
            } else { // Fallback if response structure is unexpected, assume it's an array or empty
                setReviews(Array.isArray(res) ? res : []);
                setTotalItems(Array.isArray(res) ? res.length : 0);
                setTotalPages(Array.isArray(res) ? Math.ceil(res.length / limit) : 1);
            }
        } catch (err) {
            console.error(err);
            setError("Failed to load reviews");
            setReviews([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        try {
            await adminService.deleteReview(id);
            loadReviews(currentPage, itemsPerPage, search, ratingFilter);
        } catch (err) {
            alert('Deletion failed');
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Review Management</h2>
                <div className="flex gap-2">
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                        <SelectTrigger className="w-[130px]">
                            <SelectValue placeholder="All Ratings" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Ratings</SelectItem>
                            <SelectItem value="5">5 Stars</SelectItem>
                            <SelectItem value="4">4 Stars</SelectItem>
                            <SelectItem value="3">3 Stars</SelectItem>
                            <SelectItem value="2">2 Stars</SelectItem>
                            <SelectItem value="1">1 Star</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={() => loadReviews(currentPage, itemsPerPage, search, ratingFilter)} variant="outline" size="sm">Refresh</Button>
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by user name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                />
            </div>

            <div className="grid gap-4">
                {loading && reviews.length === 0 ? (
                    <p className="text-center py-8">Loading reviews...</p>
                ) : error ? (
                    <p className="text-red-500 text-center py-8">{error}</p>
                ) : reviews.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No reviews found.</p>
                ) : (
                    reviews.map((review) => (
                        <Card key={review.id} className="overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-2 flex-grow">
                                        <div className="flex items-center gap-2">
                                            <Link 
                                                to={`/admin/users/${review.user_id}/details`}
                                                className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer"
                                            >
                                                {review.user_name}
                                            </Link>
                                            <div className="flex text-yellow-500">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-current' : 'text-muted-foreground/30'}`} />
                                                ))}
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] h-5">
                                                ID: {review.id}
                                            </Badge>
                                        </div>
                                        <p className="text-sm leading-relaxed">{review.comment}</p>
                                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <span>Product ID: {review.product_id}</span>
                                            <span>•</span>
                                            <span>{formatDate(review.created_at)}</span>
                                            <span>•</span>
                                            <span className={review.status === 'APPROVED' ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                                                {review.status}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                        onClick={() => handleDelete(review.id)}
                                    >
                                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-muted-foreground font-medium">
                    Total: <span className="text-foreground">{totalItems}</span> reviews
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
