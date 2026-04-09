import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Package,
  Store,
  TrendingUp,
  IndianRupee,
  Users,
  AlertTriangle,
  Calendar,
  ShoppingCart,
  Eye,
  Star,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Box,
  Activity,
  Tag,
  Image as ImageIcon
} from 'lucide-react';
import { adminService } from '@/index.js';
import { formatDate } from '@/lib/utils';

const parseValue = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.flatMap(v => parseValue(v));
  if (typeof val === 'string') {
    let cleaned = val.trim();
    if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) return parsed.flatMap(v => parseValue(v));
      } catch (e) { cleaned = cleaned.replace(/^\[|\]$/g, ''); }
    }
    return cleaned.split(',').map(v => v.trim().replace(/^["']|["']$/g, '').replace(/[\[\]"]/g, '')).filter(v => v && v !== 'null' && v !== 'undefined');
  }
  return [String(val).trim()];
};



export default function AdminInventoryDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inventoryDetails, setInventoryDetails] = useState(null);

  useEffect(() => {
    loadInventoryDetails();
  }, [productId]);

  async function loadInventoryDetails() {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getInventoryDetails(productId);
      setInventoryDetails(response.data);
    } catch (err) {
      console.error('Failed to load inventory details:', err);
      setError('Failed to load inventory details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground animate-pulse">Loading inventory details...</p>
      </div>

    );
  }

  if (error || !inventoryDetails) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-8">{error || "The requested inventory details could not be retrieved."}</p>

      </div>

    );
  }

  const { product, seller, sales_summary, recent_buyers, risk_flags } = inventoryDetails;

  return (

    <div className="w-full px-6 py-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">

          <h1 className="text-3xl font-bold">Inventory Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={product.is_active ? 'success' : 'destructive'}>
            {product.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <Badge variant="outline">{product.format}</Badge>
        </div>
      </div>

      {/* Product Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Product Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Product ID</p>
              <p className="font-bold text-lg">#{product.id}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Type</p>
              <Badge variant="outline" className="font-bold bg-muted/50">{product.product_type_label || 'STATIONERY'}</Badge>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Category</p>
              <p className="font-semibold text-sm truncate">{product.category_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Subcategory</p>
              <p className="font-semibold text-sm truncate">{product.subcategory_name}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">MRP</p>
              <p className="font-bold text-muted-foreground line-through decoration-destructive/50">₹{product.mrp}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Selling Price</p>
              <p className="font-extrabold text-primary text-xl">₹{product.selling_price}</p>
            </div>

            <div className="md:col-span-2 lg:col-span-2">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Title</p>
              <p className="font-bold text-sm truncate">{product.title}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">SKU</p>
              <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-primary">{product.sku || 'N/A'}</code>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Stock</p>
              <Badge variant={product.stock > 10 ? "outline" : "destructive"} className="font-bold">
                {product.stock} units
              </Badge>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Status & Format</p>
              <div className="flex items-center gap-1">
                <Badge variant={product.is_active ? 'success' : 'destructive'} className="text-[10px] px-1.5 py-0">
                  {product.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{product.format}</Badge>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Rating</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="font-bold text-sm">{product.rating}</span>
                <span className="text-[10px] text-muted-foreground">({product.review_count})</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="flex w-max md:w-full md:grid md:grid-cols-6">
            <TabsTrigger value="details" className="data-[state=active]:text-primary">Details</TabsTrigger>
            <TabsTrigger value="seller" className="data-[state=active]:text-primary">Seller Info</TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:text-primary">Sales & Revenue</TabsTrigger>
            <TabsTrigger value="buyers" className="data-[state=active]:text-primary">Recent Buyers</TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:text-primary">Risk Flags</TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:text-primary">Metrics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-muted/20">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-70">
                    <ImageIcon className="h-4 w-4 text-primary" /> Product Media
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-muted overflow-hidden bg-card flex items-center justify-center p-4 group relative">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-30">
                          <Package className="h-12 w-12" />
                          <span className="text-xs font-medium">No Image</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="bg-card/80 backdrop-blur-sm shadow-sm">Main</Badge>
                      </div>
                    </div>
                    {product.images && product.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {product.images.map((img, idx) => (
                          <div key={idx} className="aspect-square rounded-lg border border-muted overflow-hidden bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer p-1">
                            <img src={img} alt={`${product.title} ${idx}`} className="w-full h-full object-contain" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Commercials */}
              <Card className="border-none shadow-md">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-70">
                    <IndianRupee className="h-4 w-4 text-primary" /> Pricing & Commercials
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Maximum Retail Price (MRP)</p>
                    <p className="font-bold text-lg text-muted-foreground line-through">₹{product.mrp}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Selling Price</p>
                    <p className="font-extrabold text-2xl text-primary">₹{product.selling_price}</p>
                  </div>

                  <div className="pt-4 border-t border-dashed space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">GST Rate</span>
                      <Badge variant="secondary" className="font-bold bg-secondary text-secondary-foreground">{product.gst_rate}%</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">GST Inclusion</span>
                      <span className="font-semibold text-xs py-0.5 px-2 bg-muted rounded-full">
                        {product.is_gst_inclusive ? 'INCLUSIVE' : 'EXCLUSIVE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Admin Commission</span>
                      <span className="font-bold text-accent">{product.commission_percentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Inventory & Shipping */}
              <Card className="border-none shadow-md">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-70">
                    <Box className="h-4 w-4 text-primary" /> Inventory & Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Stock Quantity</p>
                      <p className={`text-xl font-bold ${product.stock <= 10 ? 'text-destructive' : 'text-foreground'}`}>
                        {product.stock} <span className="text-xs font-medium text-muted-foreground">units</span>
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Weight</p>
                      <p className="text-xl font-bold">
                        {product.weight} <span className="text-xs font-medium text-muted-foreground">kg</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-4 border-t border-dashed">
                    <span className="text-muted-foreground font-medium">Unlimited Stock</span>
                    <Badge variant={product.is_unlimited_stock ? 'success' : 'outline'}>
                      {product.is_unlimited_stock ? 'YES' : 'NO'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information Group */}
              <Card className="border-none shadow-md">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-70">
                    <Activity className="h-4 w-4 text-primary" /> Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Product Name</p>
                      <p className="text-base font-bold">{product.title}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">SKU (Stock Keeping Unit)</p>
                      <code className="bg-muted/50 px-2 py-1 rounded text-sm font-mono font-bold text-primary">{product.sku || 'NOT SET'}</code>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Internal Slug/Hash</p>
                      <p className="text-sm font-medium text-muted-foreground truncate opacity-70">{product.title?.toLowerCase().replace(/\s+/g, '-') || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Product Format</p>
                      <Badge variant="outline" className="font-bold border-border text-foreground bg-muted">{product.format}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-dashed">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">General Description and Details</p>
                    <p className="text-sm border rounded-xl p-4 bg-muted/5 leading-relaxed text-muted-foreground">
                      {product.description || product.attributes?.description || "No description provided."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Profile & Metadata */}
              <Card className="border-none shadow-md">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 opacity-70">
                    <Box className="h-4 w-4 text-accent" /> General Specifications & Attributes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-8">
                  {/* Technical Attributes from JSON */}
                  {(product.attributes?.isbn || product.attributes?.author || product.attributes?.publisher || product.attributes?.brand || product.attributes?.material || product.attributes?.pack_size) && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-tight text-primary/60">Technical Profile</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {product.attributes?.isbn && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">ISBN</span>
                            <span className="text-sm font-bold">{product.attributes.isbn}</span>
                          </div>
                        )}
                        {product.attributes?.author && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Author</span>
                            <span className="text-sm font-bold">{product.attributes.author}</span>
                          </div>
                        )}
                        {product.attributes?.publisher && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Publisher</span>
                            <span className="text-sm font-bold">{product.attributes.publisher}</span>
                          </div>
                        )}
                        {product.attributes?.brand && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Brand</span>
                            <span className="text-sm font-bold">{product.attributes.brand}</span>
                          </div>
                        )}
                        {product.attributes?.material && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Material</span>
                            <span className="text-sm font-bold">{product.attributes.material}</span>
                          </div>
                        )}
                        {product.attributes?.pack_size && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pack Size</span>
                            <span className="text-sm font-bold">{product.attributes.pack_size}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Metadata Mapping */}
                  {product.metadata && Object.keys(product.metadata).length > 0 && (
                    <div className="space-y-4 pt-6 border-t font-sans">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-tight text-primary/50">Category Specific Metadata</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(product.metadata).map(([key, value]) => (
                          <div key={key} className="p-3 rounded-xl bg-muted/20 border border-muted/50 flex flex-col gap-1 hover:bg-card hover:shadow-sm transition-all">
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">{key.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold text-primary">
                              {Array.isArray(value) ? value.join(' • ') : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {product.attributes?.specifications && (
                    <div className="space-y-2 pt-6 border-t">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Brief Specifications</h4>
                      <div className="bg-primary/5 rounded-xl p-4 text-sm whitespace-pre-wrap border border-primary/10 italic text-primary/80">
                        {product.attributes.specifications}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEO Group */}
              <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-muted/30 to-card">
                <CardHeader className="bg-primary pb-4 border-b">
                  <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-primary-foreground">
                    <Tag className="h-4 w-4" /> Search Engine Optimized (SEO)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-5 text-sm">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Meta Title</p>
                    <p className="font-bold text-foreground text-lg hover:underline cursor-pointer leading-tight">{product.meta_title || product.title}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Meta Description</p>
                    <p className="text-muted-foreground leading-relaxed italic bg-card p-4 rounded-xl border border-border shadow-sm">
                      {product.meta_description ? `"${product.meta_description}"` : 'No meta description configured. Search engines will generate one from content.'}
                    </p>
                  </div>
                  <div className="pt-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 mb-2">Discovery Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...parseValue(product.category_name),
                        ...parseValue(product.subcategory_name),
                        ...parseValue(product.tags),
                        ...parseValue(product.attributes?.brand),
                        ...parseValue(product.attributes?.material),
                      ]
                        .map(t => t.trim())
                        .filter((v, i, a) => v && a.indexOf(v) === i)
                        .map((tag, i) => (
                          <Badge key={i} className="px-3 py-1 font-bold text-[10px] bg-secondary text-secondary-foreground border-border rounded-full hover:bg-primary hover:text-primary-foreground transition-colors">
                            #{tag.replace(/^#/, '')}
                          </Badge>
                        ))}
                      {(!product.tags && !product.category_name) && (
                        <span className="text-xs text-muted-foreground italic">No tags associated</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Seller Info Tab */}
        <TabsContent value="seller">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Seller Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {seller ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Seller ID</p>
                      <p className="font-semibold">#{seller.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-semibold">{seller.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        {seller.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Seller Since</p>
                      <p className="font-semibold flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(seller.seller_since)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-semibold">{seller.business_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Business Location</p>
                      <p className="font-semibold">{seller.business_location || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Approval Status</p>
                      <Badge variant={seller.approval_status === 'APPROVED' ? 'success' : 'warning'}>
                        {seller.approval_status}
                      </Badge>
                    </div>
                  </div>
                  <div className="lg:col-span-2 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/sellers/${seller.id}/details`)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" /> View Full Seller Profile
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Seller information not available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales & Revenue Tab */}
        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> Sales Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Orders</span>
                  <span className="font-semibold text-lg">{sales_summary.total_orders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Quantity Sold</span>
                  <span className="font-semibold">{sales_summary.total_quantity_sold} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Revenue</span>
                  <span className="font-semibold text-lg">₹{sales_summary.total_revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg Selling Price</span>
                  <span className="font-semibold">₹{sales_summary.avg_selling_price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Avg Orders/Month</span>
                  <span className="font-semibold">{sales_summary.avg_orders_per_month}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" /> Financial Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center"><IndianRupee className="h-4 w-4 mr-2" /> Admin Commission</span>
                  <span className="font-semibold">₹{sales_summary.admin_commission_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Seller Payout</span>
                  <span className="font-semibold">₹{sales_summary.seller_payout_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Profit Margin</span>
                  <span className="font-semibold">{sales_summary.profit_margin}%</span>
                </div>
                <div className="border-t pt-4">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>First Sale: {formatDate(sales_summary.first_sale_date)}</p>
                    <p>Last Sale: {formatDate(sales_summary.last_sale_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recent Buyers Tab */}
        <TabsContent value="buyers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Recent Buyers ({recent_buyers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent_buyers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No buyers yet</p>
              ) : (
                <div className="space-y-4">
                  {recent_buyers.map((buyer, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold">{buyer.buyer_name}</p>
                          <p className="text-sm text-muted-foreground">Order #{buyer.order_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{buyer.order_value.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {buyer.quantity} × ₹{buyer.unit_price.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(buyer.order_date)}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/users/${buyer.buyer_id}/details`)}
                          className="mt-2 text-primary hover:text-primary hover:bg-primary/5 h-8 p-0 px-2"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Flags Tab */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className={`p-4 rounded-lg border ${risk_flags.zero_sales ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {risk_flags.zero_sales ? <XCircle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-success" />}
                    <span className="font-semibold">Zero Sales</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{risk_flags.zero_sales ? 'No sales recorded' : 'Has sales activity'}</p>
                </div>

                <div className={`p-4 rounded-lg border ${risk_flags.low_stock ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {risk_flags.low_stock ? <XCircle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-success" />}
                    <span className="font-semibold">Low Stock</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{risk_flags.low_stock ? `Only ${product.stock} units left` : 'Sufficient stock'}</p>
                </div>

                <div className={`p-4 rounded-lg border ${risk_flags.overpriced ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {risk_flags.overpriced ? <AlertTriangle className="h-5 w-5 text-warning" /> : <CheckCircle className="h-5 w-5 text-success" />}
                    <span className="font-semibold">Pricing</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{risk_flags.overpriced ? 'Priced near MRP' : 'Well priced'}</p>
                </div>

                <div className={`p-4 rounded-lg border ${risk_flags.underperforming ? 'bg-warning/5 border-warning/20' : 'bg-success/5 border-success/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {risk_flags.underperforming ? <AlertTriangle className="h-5 w-5 text-warning" /> : <CheckCircle className="h-5 w-5 text-success" />}
                    <span className="font-semibold">Performance</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{risk_flags.underperforming ? 'Low recent activity' : 'Good performance'}</p>
                </div>

                <div className={`p-4 rounded-lg border ${risk_flags.old_inventory ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {risk_flags.old_inventory ? <XCircle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-success" />}
                    <span className="font-semibold">Age</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{risk_flags.old_inventory ? 'Old unsold inventory' : 'Fresh inventory'}</p>
                </div>

                <div className={`p-4 rounded-lg border ${risk_flags.seller_unapproved ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {risk_flags.seller_unapproved ? <XCircle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-success" />}
                    <span className="font-semibold">Seller Status</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{risk_flags.seller_unapproved ? 'Seller not approved' : 'Seller approved'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" /> Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Days Since First Sale</span>
                  <span className="font-semibold">{sales_summary.days_since_first_sale}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Days Since Last Sale</span>
                  <span className="font-semibold">{sales_summary.days_since_last_sale}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Orders/Month</span>
                  <span className="font-semibold">{sales_summary.avg_orders_per_month}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Profit Margin</span>
                  <span className="font-semibold">{sales_summary.profit_margin}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" /> Time Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Product Created</span>
                  <span className="font-semibold">{formatDate(product.created_at)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Last Updated</span>
                  <span className="font-semibold">{formatDate(product.updated_at)}</span>
                </div>
                {sales_summary.first_sale_date && (
                  <div className="flex justify-between items-center">
                    <span>First Sale</span>
                    <span className="font-semibold">{formatDate(sales_summary.first_sale_date)}</span>
                  </div>
                )}
                {sales_summary.last_sale_date && (
                  <div className="flex justify-between items-center">
                    <span>Last Sale</span>
                    <span className="font-semibold">{formatDate(sales_summary.last_sale_date)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>

  );
}