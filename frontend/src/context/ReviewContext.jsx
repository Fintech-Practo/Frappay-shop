import { createContext, useContext, useState } from 'react';
import api from '@/config/api';
import { useAuth } from './AuthContext';

const ReviewContext = createContext(null);

export function ReviewProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const getBookReviews = async (bookId, filters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const res = await api.get(`/api/reviews/book/${bookId}?${params.toString()}`);
      if (res.data.success) {
        return {
          reviews: res.data.data.reviews || [],
          stats: res.data.data.stats || { total_reviews: 0, average_rating: 0 }
        };
      }
      return { reviews: [], stats: { total_reviews: 0, average_rating: 0 } };
    } catch (error) {
      console.error('Failed to fetch reviews', error);
      return { reviews: [], stats: { total_reviews: 0, average_rating: 0 } };
    } finally {
      setLoading(false);
    }
  };

  const getBookRatingStats = async (bookId) => {
    try {
      const res = await api.get(`/api/reviews/book/${bookId}/stats`);
      if (res.data.success) {
        return res.data.data || { total_reviews: 0, average_rating: 0 };
      }
      return { total_reviews: 0, average_rating: 0 };
    } catch (error) {
      console.error('Failed to fetch rating stats', error);
      return { total_reviews: 0, average_rating: 0 };
    }
  };

  const createReview = async (bookId, reviewData) => {
    if (!isAuthenticated) {
      throw new Error('Please login to submit a review');
    }

    try {
      setLoading(true);
      const res = await api.post('/api/reviews', {
        book_id: bookId,
        ...reviewData
      });
      if (res.data.success) {
        return res.data.data;
      }
      throw new Error(res.data.message || 'Failed to create review');
    } catch (error) {
      console.error('Failed to create review', error);
      throw error.response?.data?.message || 'Failed to create review';
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (reviewId, reviewData) => {
    if (!isAuthenticated) {
      throw new Error('Please login to update a review');
    }

    try {
      setLoading(true);
      const res = await api.put(`/api/reviews/${reviewId}`, reviewData);
      if (res.data.success) {
        return res.data.data;
      }
      throw new Error(res.data.message || 'Failed to update review');
    } catch (error) {
      console.error('Failed to update review', error);
      throw error.response?.data?.message || 'Failed to update review';
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (reviewId) => {
    if (!isAuthenticated) {
      throw new Error('Please login to delete a review');
    }

    try {
      setLoading(true);
      await api.delete(`/api/reviews/${reviewId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete review', error);
      throw error.response?.data?.message || 'Failed to delete review';
    } finally {
      setLoading(false);
    }
  };

  const getReviewComments = async (reviewId) => {
    try {
      const res = await api.get(`/api/reviews/${reviewId}/comments`);
      if (res.data.success) {
        return res.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch comments', error);
      return [];
    }
  };

  const createComment = async (reviewId, commentText) => {
    if (!isAuthenticated) {
      throw new Error('Please login to add a comment');
    }

    try {
      setLoading(true);
      const res = await api.post('/api/reviews/comments', {
        review_id: parseInt(reviewId),
        comment: commentText
      });
      if (res.data.success) {
        return res.data.data;
      }
      throw new Error(res.data.message || 'Failed to create comment');
    } catch (error) {
      console.error('Failed to create comment', error);
      throw error.response?.data?.message || 'Failed to create comment';
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (commentId) => {
    if (!isAuthenticated) {
      throw new Error('Please login to delete a comment');
    }

    try {
      setLoading(true);
      await api.delete(`/api/reviews/comments/${commentId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete comment', error);
      throw error.response?.data?.message || 'Failed to delete comment';
    } finally {
      setLoading(false);
    }
  };

  const value = {
    loading,
    getBookReviews,
    getBookRatingStats,
    createReview,
    updateReview,
    deleteReview,
    getReviewComments,
    createComment,
    deleteComment
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
}

export default ReviewContext;