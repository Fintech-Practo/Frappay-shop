import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  User,
  Calendar,
  IndianRupee,
  CreditCard,
  MapPin,
  Truck,
  Download,
  FileText,
  Activity,
  Store,
  Mail,
  AlertTriangle,
  Copy,
  Eye,
  Clock,
  RefreshCw
} from 'lucide-react';
import { adminService } from '@/index.js';
import { formatDate } from '@/lib/utils';

export default function AdminOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);

  const [smsLogs, setSmsLogs] = useState([]);
  const [loadingSms, setLoadingSms] = useState(false);

  useEffect(() => {
    loadOrderDetails();
    loadSmsLogs();
  }, [orderId]);

  async function loadSmsLogs() {
    try {
      setLoadingSms(true);
      const response = await adminService.getOrderSMSLogs(orderId);
      setSmsLogs(response.data || []);
    } catch (err) {
      console.error('Failed to load SMS logs:', err);
    } finally {
      setLoadingSms(false);
    }
  }

  async function loadOrderDetails() {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getOrderDetails(orderId);
      setOrderDetails(response.data);
    } catch (err) {
      console.error('Failed to load order details:', err);
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryLabel() {
    try {
      const response = await adminService.retryLabel(orderId);
      if (response.success) {
        // Auto-refresh after 5s
        setTimeout(() => loadOrderDetails(), 5000);
      }
    } catch (err) {
      console.error('Failed to retry label:', err);
    }
  }

  async function handleRetryPickup() {
    try {
      const response = await adminService.retryPickup(orderId);
      if (response.success) {
        // Auto-refresh after 5s
        setTimeout(() => loadOrderDetails(), 5000);
      }
    } catch (err) {
      console.error('Failed to retry pickup:', err);
    }
  }

  if (loading) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground animate-pulse">Loading order details...</p>
      </div>

    );
  }

  if (error || !orderDetails) {
    return (

      <div className="container py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
        <p className="text-muted-foreground mb-8">{error || "The requested order details could not be retrieved."}</p>

      </div>

    );
  }

  const { order, buyer, items, seller_breakdown, financials, fulfillment, timeline, payment } = orderDetails;

  const getStatusColor = (status = '') => {
    const s = status.toUpperCase();
    switch (s) {
      case 'DELIVERED':
      case 'COMPLETED': return 'success';
      case 'SHIPPED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        return 'secondary';
      case 'CANCELLED': return 'destructive';
      case 'PENDING': return 'warning';
      case 'CONFIRMED': return 'outline';
      case 'RETURNED': return 'destructive';
      default: return 'outline';
    }
  };

  const getPaymentStatusColor = (status = '') => {
    const s = status.toUpperCase();
    switch (s) {
      case 'PAID': return 'success';
      case 'PENDING': return 'warning';
      case 'FAILED': return 'destructive';
      default: return 'outline';
    }
  };

  return (

    <div className="w-full px-6 py-12 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">

          <h1 className="text-3xl font-bold">Order Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          {order.shipments && order.shipments[0] && (
            <div className="flex items-center gap-2">
              {order.shipments[0].label_status === 'ready' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex items-center gap-2 border-primary text-primary hover:bg-primary/10"
                  onClick={() => window.open(order.shipments[0].label_s3_url || order.label_s3_url, '_blank')}
                >
                  <Download className="h-4 w-4" /> Download Label
                </Button>
              ) : order.shipments[0].label_status === 'failed' ? (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="animate-pulse">Label Failed</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/5 border border-primary/20"
                    onClick={handleRetryLabel}
                  >
                    <Clock className="mr-1 h-3 w-3" /> Retry
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md border border-border">
                  <Clock className="h-4 w-4 text-muted-foreground animate-spin" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Label {order.shipments[0].label_status || 'Pending'}...
                  </span>
                </div>
              )}
            </div>
          )}
          <Badge variant={getStatusColor(order.status)}>
            {order.status}
          </Badge>
          <Badge variant={getPaymentStatusColor(order.payment_status)}>
            {order.payment_status}
          </Badge>
        </div>
      </div>

      {/* Order Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Order Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-semibold">#{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice</p>
              <p className="font-semibold flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                {order.invoice_number || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-semibold flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(order.order_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="outline">{order.order_type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-semibold">₹{order.total_amount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <Badge variant={getPaymentStatusColor(order.payment_status)}>
                {order.payment_status}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-semibold">{formatDate(order.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="items" className="space-y-4">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="flex w-max md:w-full md:grid md:grid-cols-7">
            <TabsTrigger value="items" className="data-[state=active]:text-primary">Items & Sellers</TabsTrigger>
            <TabsTrigger value="buyer" className="data-[state=active]:text-primary">Buyer</TabsTrigger>
            <TabsTrigger value="financials" className="data-[state=active]:text-primary">Financials</TabsTrigger>
            <TabsTrigger value="fulfillment" className="data-[state=active]:text-primary">Fulfillment</TabsTrigger>
            <TabsTrigger value="sellers" className="data-[state=active]:text-primary">Seller Splits</TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:text-primary">Payment</TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:text-primary">Timeline</TabsTrigger>
            <TabsTrigger value="sms" className="data-[state=active]:text-primary">SMS History</TabsTrigger>
          </TabsList>
        </div>
        {/* Items & Sellers Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Order Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{item.product_title}</h4>
                          <Badge variant="outline">{item.format}</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => navigate(`/admin/inventory/${item.product_id}`)}
                            title="View Inventory Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Quantity</p>
                            <p className="font-semibold">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Unit Price</p>
                            <p className="font-semibold">₹{item.price}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Seller</p>
                            <p className="font-semibold">{item.seller_name || 'System'}</p>
                          </div>
                        </div>
                        {item.commission_percentage > 0 && (
                          <div className="pt-3 border-t">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-sm text-muted-foreground">Commission</p>
                                <p className="font-semibold">{item.commission_percentage}%</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Commission Amount</p>
                                <p className="font-semibold">₹{item.commission_amount.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Seller Payout</p>
                                <p className="font-semibold">₹{item.seller_payout.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt={item.product_title}
                          className="h-16 w-16 object-cover rounded ml-4 flex-shrink-0"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Buyer Details Tab */}
        <TabsContent value="buyer">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" /> Buyer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {buyer ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* LEFT SIDE */}
                  <div className="space-y-4">

                    {/* TOP SECTION (Image + Name + Email + Button) */}
                    <div className="flex items-start gap-4">

                      {buyer.profile_image_url && (
                        <div className="flex flex-col items-start">
                          <img
                            src={buyer.profile_image_url}
                            alt="Profile"
                            className="h-20 w-20 rounded-full object-cover"
                          />
                          <p className="text-sm text-muted-foreground mt-1">Profile Image</p>
                        </div>
                      )}

                      <div className="flex-1">
                        {/* Name */}
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-semibold">{buyer.name}</p>
                        </div>

                        {/* Email + Button INLINE */}
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Email</p>

                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="font-semibold flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {buyer.email}
                            </p>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => navigate(`/admin/users/${buyer.id}/details`)}
                            >
                              <User className="h-5 w-5 mr-2" />
                              View Full Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Buyer ID */}
                    <div>
                      <p className="text-sm text-muted-foreground">Buyer ID</p>
                      <p className="font-semibold">#{buyer.id}</p>
                    </div>

                    {/* Phone */}
                    {buyer.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-semibold">{buyer.phone}</p>
                      </div>
                    )}

                  </div>

                  {/* RIGHT SIDE (UNCHANGED) */}
                  <div className="space-y-4">

                    {buyer.address && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Address</p>
                        <p className="text-sm">{buyer.address}</p>
                      </div>
                    )}

                    {buyer.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{buyer.location}</span>
                      </div>
                    )}

                    <div className="pt-2"></div>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Buyer information not available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Breakdown Tab */}
        <TabsContent value="financials">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" /> Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Product Subtotal</span>
                  <span className="font-semibold text-lg">₹{Number(order.product_subtotal || 0).toFixed(2)}</span>
                </div>
                {order.coupon_discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Coupon Discount {order.coupon && <span className="text-xs text-muted-foreground mr-1">({order.coupon.code})</span>}</span>
                    <span className="text-green-600 font-semibold">- ₹{Number(order.coupon_discount).toFixed(2)}</span>
                  </div>
                )}
                {order.coin_discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Reward Coins</span>
                    <span className="text-amber-600 font-semibold">- ₹{Number(order.coin_discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span>Shipping Cost</span>
                  <span className="font-semibold text-lg">₹{Number(order.shipping_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Grand Total</span>
                  <span className="font-semibold text-lg text-primary">
                    ₹{Number(order.grand_total || order.total_amount || financials.gross_total).toFixed(2)}
                  </span>
                </div>
                {financials.total_commission > 0 && (
                  <div className="flex justify-between items-center mt-2">
                    <span>Total Commission</span>
                    <span className="font-semibold">₹{financials.total_commission.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Admin Net Profit</span>
                    <span className="font-semibold text-success">₹{financials.admin_net_profit.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Seller Payout Total</span>
                  <span className="font-semibold">₹{financials.seller_payout_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Order Total</span>
                  <span className="font-semibold">₹{(financials.order_total ?? 0).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Payment Status</span>
                  <Badge variant={getPaymentStatusColor(financials.payment_status)}>
                    {financials.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Order Type</span>
                  <Badge variant="outline">{financials.order_type}</Badge>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Net Revenue after fees:</p>
                    <p className="font-semibold text-lg">
                      ₹{(financials.order_total ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fulfillment Tab */}
        <TabsContent value="fulfillment">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" /> Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm  mb-2">Shipping Address</p>
                  {fulfillment.shipping_address ? (
                    <div className="p-4  rounded-lg">
                      {typeof fulfillment.shipping_address === 'string' ? (
                        <p className="text-sm">{fulfillment.shipping_address}</p>
                      ) : (
                        <div className="text-sm space-y-1">
                          <p>{fulfillment.shipping_address.address_line1}</p>
                          {fulfillment.shipping_address.address_line2 && (
                            <p>{fulfillment.shipping_address.address_line2}</p>
                          )}
                          <p>{fulfillment.shipping_address.city}, {fulfillment.shipping_address.state}</p>
                          <p>{fulfillment.shipping_address.postal_code}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="">No shipping address</p>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Shipment Status</p>
                  <Badge variant={getStatusColor(fulfillment.shipment_status)}>
                    {fulfillment.shipment_status}
                  </Badge>
                </div>

                {order.shipments && order.shipments.length > 0 ? (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" /> Active Shipments
                    </p>
                    {order.shipments.map((ship, idx) => (
                      <div key={idx} className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs  font-medium">Courier</p>
                            <p className="font-semibold">{ship.courier_name || 'Processing'}</p>
                          </div>
                          <div>
                            <p className="text-xs  font-medium">AWB Code</p>
                            <p className="font-mono font-medium">{ship.awb_code || 'Pending'}</p>
                          </div>
                          <div>
                            <p className="text-xs  font-medium">Est. Delivery</p>
                            <p className="font-medium text-primary">{ship.estimated_delivery_days || order.estimated_delivery_days || '3-5'} Days</p>
                          </div>
                          <div>
                            <p className="text-xs  font-medium">Current Status</p>
                            <Badge variant="outline" className="h-5 text-[10px] uppercase">
                              {ship.admin_status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-medium">Label Status</p>
                            <Badge
                              variant={ship.label_status === 'ready' ? 'success' : ship.label_status === 'failed' ? 'destructive' : 'outline'}
                              className="h-5 text-[10px] uppercase"
                            >
                              {ship.label_status || 'Pending'}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-medium">Pickup Status</p>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={ship.pickup_status === 'requested' ? 'success' : ship.pickup_status === 'failed' ? 'destructive' : 'outline'}
                                className="h-5 text-[10px] uppercase"
                              >
                                {ship.pickup_status || 'Pending'}
                              </Badge>
                              {ship.pickup_status === 'failed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-primary hover:bg-primary/5"
                                  onClick={handleRetryPickup}
                                  title="Retry Pickup Request"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {ship.tracking_url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              let url = ship.tracking_url;
                              if (!url) return;
                              if (url.includes('undefined') || url.includes('null') || !url.startsWith('http')) {
                                const awb = ship.awb_code || url.replace('undefined', '').replace('null', '').replace('https://', '').replace('http://', '');
                                url = `https://www.delhivery.com/track/package/${awb}`;
                              }
                              window.open(url, '_blank');
                            }}
                          >
                            Track Package →
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : fulfillment.delivery_date && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Expected Delivery</p>
                    <p className="font-semibold">{formatDate(fulfillment.delivery_date)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" /> Downloadable Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fulfillment.downloadable_items.length > 0 ? (
                  <div className="space-y-3">
                    {fulfillment.downloadable_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-semibold text-sm">{item.product_title}</p>
                          <p className="text-xs text-muted-foreground">Downloads: {item.download_count}</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          View Link
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No downloadable items</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Seller Splits Tab */}
        <TabsContent value="sellers">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" /> Seller Breakdown ({seller_breakdown.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {seller_breakdown.map((seller, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold">{seller.seller_name}</h4>
                        <p className="text-sm text-muted-foreground">{seller.seller_email}</p>
                      </div>
                      <Badge variant="outline">ID: {seller.seller_id}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="font-semibold">₹{seller.total_sales.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Commission</p>
                        <p className="font-semibold">₹{seller.total_commission.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Net Payout</p>
                        <p className="font-semibold">₹{seller.total_payout.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground mb-2">Items ({seller.items.length})</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {seller.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex justify-between items-center text-sm py-1">
                            <span className="truncate">{item.product_title} × {item.quantity}</span>
                            <span>₹{item.item_total.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" /> Order Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-0 pb-8">
              {/* Vertical Line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border ml-2.5"></div>

              {(orderDetails.status_history || timeline).map((event, idx) => (
                <div key={idx} className="relative flex items-start space-x-4 pb-8 last:pb-0">
                  <div className="z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-primary mt-0.5 ml-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{event.info || event.description}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{event.admin_status || event.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(event.created_at || event.date)} {new Date(event.created_at || event.date).toLocaleTimeString()}
                    </p>
                    {event.remarks && (
                      <p className="mt-2 text-xs p-2 bg-secondary/50 rounded-md italic text-muted-foreground border-l-2 border-primary/30">
                        "{event.remarks}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS History Tab */}
        <TabsContent value="sms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" /> SMS Dispatch Logs
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={loadSmsLogs} disabled={loadingSms}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingSms ? 'animate-spin' : ''}`} /> Status Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingSms ? (
                <div className="py-10 text-center animate-pulse">Loading SMS logs...</div>
              ) : smsLogs.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground italic">No SMS logs found for this order.</div>
              ) : (
                <div className="space-y-4">
                  {smsLogs.map((log, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-muted/20">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge variant={log.status === 'SENT' ? 'success' : 'destructive'} className="mb-2">
                            {log.status}
                          </Badge>
                          <p className="text-sm font-semibold text-primary">{log.event_type.replace(/_/g, ' ')}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(log.created_at)} {new Date(log.created_at).toLocaleTimeString()}</p>
                      </div>
                      <p className="text-xs font-mono bg-background p-2 rounded border mb-2 break-all">{log.message}</p>
                      <div className="flex gap-4 text-[10px] text-muted-foreground mt-2 border-t pt-2">
                        <span><span className="font-semibold">Phone:</span> {log.phone}</span>
                        <span><span className="font-semibold">Template ID:</span> {log.template_id}</span>
                        {log.provider_response && (
                          <span className="truncate"><span className="font-semibold">Provider ID:</span> {typeof log.provider_response === 'string' ? JSON.parse(log.provider_response).msgid : log.provider_response.msgid}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Payment Ledger & Transaction Details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {payment ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Payment Gateway */}
                    {payment.gateway && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Payment Gateway</p>
                        <p className="text-base font-semibold">{payment.gateway}</p>
                      </div>
                    )}

                    {/* Transaction Amount */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Transaction Amount</p>
                      <p className="text-xl font-bold text-primary">₹{parseFloat(payment.amount || 0).toFixed(2)}</p>
                    </div>

                    {/* Payment Status */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                      <Badge
                        variant={payment.status === 'SUCCESS' ? 'default' : payment.status === 'PENDING' ? 'secondary' : 'destructive'}
                        className="text-sm px-3 py-1"
                      >
                        {payment.status === 'SUCCESS' ? 'SUCCESS' : payment.status}
                      </Badge>
                    </div>

                    {/* Transaction Date */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Transaction Date</p>
                      <p className="text-sm font-medium">
                        {new Date(payment.created_at).toLocaleString('en-IN', {
                          dateStyle: 'long',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>

                    {/* Payment Session ID */}
                    {payment.payment_session_id && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Payment Session ID</p>
                        <p className="font-mono text-xs break-all   p-2 rounded border">
                          {payment.payment_session_id}
                        </p>
                      </div>
                    )}

                    {/* Gateway Transaction ID */}
                    {payment.gateway_transaction_id && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Gateway Transaction ID</p>
                        <p className="font-mono text-xs break-all p-2 rounded border">
                          {payment.gateway_transaction_id}
                        </p>
                      </div>
                    )}

                    {/* Gateway Payment ID - Only show if not empty/N/A */}
                    {payment.gateway_payment_id && payment.gateway_payment_id !== 'N/A' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Gateway Payment ID</p>
                        <p className="font-mono text-xs break-all   p-2 rounded border">
                          {payment.gateway_payment_id}
                        </p>
                      </div>
                    )}

                    {/* Transaction ID */}
                    {payment.id && payment.id !== 'N/A' && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                        <p className="font-mono text-xs break-all   p-2 rounded border">
                          {payment.id}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Raw Gateway Response - Better formatted
                    {payment.raw_response && (
                      <div className="mt-8 pt-6 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-semibold">Raw Gateway Response</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const textarea = document.createElement('textarea');
                              textarea.value = JSON.stringify(payment.raw_response, null, 2);
                              document.body.appendChild(textarea);
                              textarea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textarea);
                              // You can add a toast notification here
                            }}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy JSON
                          </Button>
                        </div>
                        <div className="bg-gray-50 rounded-lg border overflow-hidden">
                          <pre className="p-4 text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono">
                            {JSON.stringify(payment.raw_response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )} */}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No payment transaction recorded for this order.</p>
                  <p className="text-sm text-muted-foreground mt-2">This may be a COD order or payment is still pending.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

  );
}