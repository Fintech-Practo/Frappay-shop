import { useState, useEffect } from 'react';
import api from '@/config/api';
import { Star, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';
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

export default function ReviewSection({
  bookId,
  onReviewsFetched,
}) {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  /* ---------------- FETCH REVIEWS ---------------- */
  useEffect(() => {
    fetchReviews();
  }, [bookId]);

  const calculateAverageRating = (list) => {
    if (!list.length) return 0;
    const total = list.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    return Number((total / list.length).toFixed(1));
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/reviews/${bookId}`);

      if (res.data.success) {
        const fetched = res.data.data || [];
        setReviews(fetched);

        const avg = calculateAverageRating(fetched);

        // 🔥 Notify parent immediately
        onReviewsFetched?.(fetched.length, avg);
      }
    } catch (err) {
      console.error('Fetch reviews failed', err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SUBMIT REVIEW ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    try {
      setSubmitting(true);
      const res = await api.post('/api/reviews', {
        product_id: bookId,
        rating,
        comment,
      });

      if (res.data.success) {
        toast({
          title: 'Success',
          description: 'Review submitted successfully',
        });

        setRating(5);
        setComment('');
        await fetchReviews(); // 🔥 instant refresh
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit review';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- DELETE REVIEW ---------------- */
  const confirmDelete = async () => {
    if (!reviewToDelete) return;

    try {
      await api.delete(`/api/reviews/${reviewToDelete}`);
      toast({
        title: 'Deleted',
        description: 'Your review has been deleted',
      });

      await fetchReviews(); // 🔥 instant refresh
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Delete failed',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* WRITE REVIEW */}
      {isAuthenticated && (
        <div className="bg-muted/30 p-6 rounded-xl border">
          <h3 className="font-semibold text-lg mb-4">Write a Review</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Rating */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-6 w-6 ${star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                      }`}
                  />
                </button>
              ))}
            </div>

            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your review (min 10 characters)"
              minLength={10}
              required
            />

            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Post Review'}
            </Button>
          </form>
        </div>
      )}

      {/* REVIEW LIST */}
      <div>
        <h3 className="font-semibold text-xl mb-4">
          Customer Reviews ({reviews.length})
        </h3>

        {loading ? (
          <p className="text-muted-foreground">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground italic">No reviews yet.</p>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-6 last:border-0">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {review.user_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                          }`}
                      />
                    ))}

                    {user?.id === review.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          setReviewToDelete(review.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="ml-11 text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DELETE CONFIRM */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
