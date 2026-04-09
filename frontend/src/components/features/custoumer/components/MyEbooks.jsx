import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  FileText,
  Search,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Book,
  Download,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import api from '@/config/api';
import { Layout } from '@/index.js';


export default function MyEbooks({ insideDashboard = false }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');





  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadEbooks();
  }, [isAuthenticated]);

  const loadEbooks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/orders/my-ebooks');
      if (res.data.success) {
        setEbooks(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load e-books:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your e-books',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRead = (ebook) => {
    if (!ebook.ebook_url) {
      toast({
        title: 'Unavailable',
        description: 'E-book content is not available yet.',
        variant: 'destructive',
      });
      return;
    }

    // Navigate to the secure reader
    navigate(`/ebooks/${ebook.order_id}/read/${ebook.product_id}`);
  };

  // The local formatDate function is replaced by the imported one.
  // The original content of this function is removed.
  // The call to `date.toLocaleDateString` is replaced by `formatDate(dateString)`.
  // The `date` variable is no longer needed.
  // The `month` and `day` lines are removed as they were part of the old `toLocaleDateString` options.

  const formatPrice = (price) => {
    return `₹${parseFloat(price || 0).toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      CONFIRMED: { label: 'Confirmed', variant: 'default', icon: CheckCircle2 },
      PAID: { label: 'Paid', variant: 'default', icon: CheckCircle2 },
      DELIVERED: { label: 'Delivered', variant: 'default', icon: CheckCircle2 },
      PENDING: { label: 'Pending', variant: 'secondary', icon: Clock },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary', icon: Clock };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Filter ebooks
  const filteredEbooks = ebooks.filter((ebook) => {
    const matchesSearch =
      ebook.product_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ebook.attributes?.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ebook.attributes?.publisher?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'available' && ebook.ebook_url) ||
      (filterStatus === 'unavailable' && !ebook.ebook_url);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    const loadingContent = (

      <div className="container-custom py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your e-books...</p>
          </div>
        </div>
      </div>

    );
    return insideDashboard ? loadingContent : <Layout>{loadingContent}</Layout>;
  }


  const content = (

    <div className="container-custom py-6 overflow-x-hidden overflow-y-hidden ">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >


        {/* Header */}
        {/* <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                My E-Books
              </h1>
              <p className="text-muted-foreground">
                Access and download all your purchased e-books
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full md:w-auto">
              Back to Dashboard
            </Button>
          </div> */}
        <div className="space-y-2">
          {/* <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="w-fit"
          >
          Back to Dashboard
          </Button> */}
          {!insideDashboard && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="w-fit"
            >
              Back to Dashboard
            </Button>
          )}
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            My E-Books
          </h1>
          <p className="text-muted-foreground">
            Access and download all your purchased e-books
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total E-Books</p>
                  <p className="text-2xl font-bold">{ebooks.length}</p>
                </div>
                <BookOpen className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available</p>
                  <p className="text-2xl font-bold">
                    {ebooks.filter((e) => e.ebook_url).length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-2xl font-bold">
                    {formatPrice(ebooks.reduce((sum, e) => sum + parseFloat(e.price || 0), 0))}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 w-full p-2 buttom-[-3]">

              {/* Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by title, author, or publisher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full min-w-0"
                />
              </div>

              {/* Search Button */}
              <Button
                type="button"
                className="w-full md:w-[110px] shrink-0 top-2"
                onClick={() => {
                  console.log("Search:", searchQuery);
                }}
              >
                Search
              </Button>

            </div>
          </CardContent>
        </Card>



        {/* E-Books Grid */}
        {filteredEbooks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No e-books found</h3>
              <p className="text-muted-foreground mb-4">
                {ebooks.length === 0
                  ? "You haven't purchased any e-books yet."
                  : "No e-books match your search criteria."}
              </p>
              {ebooks.length === 0 && (
                <Button onClick={() => navigate('/books')}>
                  Browse Books
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEbooks.map((ebook) => (
              <motion.div
                key={`${ebook.order_id}-${ebook.product_id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="aspect-[3/4] bg-secondary rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                      {ebook.product_image ? (
                        <img
                          src={ebook.product_image}
                          alt={ebook.product_title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-16 w-16 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-2 mb-2">
                      {ebook.product_title || 'Untitled Book'}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(ebook.order_date)}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-2 mb-4">
                      {ebook.attributes?.author && (
                        <p className="text-sm">
                          <span className="font-medium">Author:</span>{' '}
                          {ebook.attributes.author}
                        </p>
                      )}
                      {ebook.attributes?.publisher && (
                        <p className="text-sm">
                          <span className="font-medium">Publisher:</span>{' '}
                          {ebook.attributes.publisher}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Price: {formatPrice(ebook.price)}
                        </span>
                        {getStatusBadge(ebook.order_status)}
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t">
                      {ebook.ebook_url ? (
                        <Button
                          className="w-full"
                          onClick={() => handleRead(ebook)}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Read Now
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant="outline"
                          disabled
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Not Available
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>

  );
  return insideDashboard ? content : <Layout>{content}</Layout>;
}