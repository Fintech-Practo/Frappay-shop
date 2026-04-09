import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/config/api';
import {
  Package, Truck, Phone, MapPin, CheckCircle, ShoppingBag, ArrowLeft,
  ArrowRight, Download, IndianRupee, User, Clock, AlertCircle, Calendar, Info, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layout } from '@/index.js';
import { cn, getOrderDisplayStatus, STATUS_CONFIG, formatDate } from '@/lib/utils';
import PaymentInfoCard from '@/components/features/order/PaymentInfoCard';

export default function SellerOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/api/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not load order details.",
        variant: "destructive"
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleMarkPacked = async () => {
    try {
      setUpdating(true);
      const res = await api.post('/api/logistics/mark-packed', { orderId: order.id });
      if (res.status === 200) {
        toast({ title: "Updated", description: "Order marked as packed. Shipment generated." });
        fetchOrder(true); // Silent refresh
      }
    } catch (err) {
      toast({
        title: "Action Failed",
        description: err.response?.data?.message || "Could not process shipment",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadLabel = async () => {
    try {
      setUpdating(true);
      const res = await api.get(`/api/logistics/label/${order.id}`);

      if (res.status === 200 && res.data?.url) {
        // ✅ Backend returns the S3 URL as JSON — open directly in new tab
        window.open(res.data.url, "_blank");
        return;
      }

      // Fallback: if somehow 202 is returned as 200
      if (res.data?.status === 'processing' || res.data?.status === 'pending') {
        toast({
          title: "Processing",
          description: "Label is still being generated. We'll notify you when it's ready."
        });
        startLabelPolling();
      }

    } catch (err) {
      if (err.response?.status === 202) {
        toast({ title: "Processing", description: "Label is being prepared. Check back in a few seconds." });
        startLabelPolling();
      } else if (err.response?.status === 404) {
        const status = err.response?.data?.status;
        if (status === 'failed') {
          toast({
            title: "Label Failed",
            description: "Label generation failed. Use 'Retry Label' to try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Not Ready",
            description: "Label is not available yet.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: err.response?.data?.message || "Could not fetch label.",
          variant: "destructive"
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const startLabelPolling = () => {
    // Poll every 5 seconds, max 10 times
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get(`/api/logistics/list?orderId=${order.id}`);
        if (res.data.success && res.data.data[0]) {
          const shipment = res.data.data[0];
          if (shipment.label_status === 'ready') {
            clearInterval(interval);
            toast({ title: "Success", description: "Label is ready for download!" });
            fetchOrder(true);
          } else if (shipment.label_status === 'failed') {
            clearInterval(interval);
            toast({ title: "Failed", description: "Label generation failed.", variant: "destructive" });
            fetchOrder(true);
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }

      if (attempts >= 10) {
        clearInterval(interval);
      }
    }, 5000);
  };

  const handleRetryLabel = async () => {
    try {
      setUpdating(true);
      const res = await api.post(`/api/logistics/retry-label/${order.id}`);
      if (res.data.success) {
        toast({ title: "Retry Initiated", description: "Label generation restarted. Please refresh in a moment." });
        // Auto-refresh after 5s
        setTimeout(() => fetchOrder(true), 5000);
      }
    } catch (err) {
      toast({ title: "Retry Failed", description: err.response?.data?.message || "Could not restart label generation.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleRetryPickup = async () => {
    try {
      setUpdating(true);
      const res = await api.post(`/api/logistics/retry-pickup/${order.id}`);
      if (res.data.success) {
        toast({ title: "Retry Initiated", description: "Pickup request restarted. Please refresh in a moment." });
        // Auto-refresh after 5s
        setTimeout(() => fetchOrder(true), 5000);
      }
    } catch (err) {
      toast({ title: "Retry Failed", description: err.response?.data?.message || "Could not restart pickup request.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      setUpdating(true);
      const res = await api.get(`/api/orders/${order.id}/invoice`);
      if (res.data.success && res.data.data.url) {
        window.open(res.data.data.url, "_blank");
      } else {
        toast({ title: "Error", description: "Invoice not available", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: err.response?.data?.message || "Could not fetch invoice.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      setUpdating(true);
      const res = await api.patch(`/api/orders/${id}/status`, { status: newStatus });
      if (res.data.success) {
        toast({ title: "Status Updated", description: `Order marked as ${newStatus}` });
        fetchOrder(true); // Silent refresh
      }
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || "Check your permissions",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const renderStatusBadge = (orderObj) => {
    const displayStatus = getOrderDisplayStatus(orderObj);
    const config = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.UNKNOWN;

    return (
      <Badge className={cn("px-3 py-1 rounded-full border text-sm font-medium", config.color)}>
        {config.label}
      </Badge>
    );
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading Fulfillment Details...</div>;
  if (!order) return <div className="p-10 text-center">Order not found.</div>;


  return (
    <Layout>
      <div className="min-h-screen bg-background py-8">
        <div className="container-custom max-w-6xl mx-auto overflow-x-hidden">

          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Order #{order.id}</h1>
                {renderStatusBadge(order)}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground text-sm">
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Placed on {formatDate(order.created_at)}
                </p>
                {order.awb_number && (
                  <p className="flex items-center gap-2 bg-primary/5 text-primary px-2 py-0.5 rounded border border-primary/20 font-medium">
                    <Truck className="h-4 w-4" /> AWB: {order.awb_number}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-3">
                {/* 1. CONFIRM: If PENDING (COD or Prepaid) */}
                {order.status === 'PENDING' && (
                  <Button
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        const res = await api.post(`/api/orders/${order.id}/confirm`);
                        if (res.status === 200) {
                          toast({ title: "Confirmed", description: "Order confirmed successfully." });
                          fetchOrder(true);
                        }
                      } catch (err) {
                        toast({
                          title: "Confirmation Failed",
                          description: err.response?.data?.message || "Failed to confirm order.",
                          variant: "destructive"
                        });
                      } finally { setUpdating(false); }
                    }}
                    disabled={updating}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Order
                  </Button>
                )}

                {/* 2. INVOICE: Always show if status is not CANCELLED */}
                {order.status !== 'CANCELLED' && (
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/10"
                    onClick={handleDownloadInvoice}
                    disabled={updating}
                  >
                    <IndianRupee className="mr-2 h-4 w-4" />
                    Invoice
                  </Button>
                )}

                {/* 2. SHIP (Logistics): If CONFIRMED */}
                {order.status === 'CONFIRMED' && (
                  <Button
                    onClick={async () => {
                      setUpdating(true);
                      try {
                        const res = await api.post(`/api/logistics/ready-to-ship`, { orderId: order.id });
                        if (res.status === 200) {
                          toast({ title: "Shipment Created", description: "AWB Generated. Next: Mark as Packed." });
                          fetchOrder(true);
                        }
                      } catch (err) {
                        toast({
                          title: "Shipment Failed",
                          description: err.response?.data?.message || "Logistics error",
                          variant: "destructive"
                        });
                      } finally { setUpdating(false); }
                    }}
                    disabled={updating}
                    className="bg-primary hover:bg-primary/80"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {updating ? 'Processing...' : 'Ready to Ship'}
                  </Button>
                )}

                {/* 3. PACK: If AWB_ASSIGNED */}
                {order.status === 'AWB_ASSIGNED' && (
                  <Button
                    onClick={handleMarkPacked}
                    disabled={updating}
                    className="bg-primary hover:bg-primary/80"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    {updating ? 'Packing...' : 'Mark as Packed'}
                  </Button>
                )}

                {/* Shipping Label Management */}
                {(['LABEL_GENERATED', 'READY_TO_SHIP', 'SHIPPED', 'PACKED'].includes(order.status)) && order.order_type !== 'DIGITAL' && (
                  <div className="flex flex-col items-end gap-1">
                    {order.shipments && order.shipments[0] && (
                      <div className="flex items-center gap-2">
                        {order.shipments[0].label_status === 'ready' || order.shipments[0].label_s3_url ? (
                          <Button
                            variant="outline"
                            className="border-primary text-primary hover:bg-primary/10"
                            onClick={handleDownloadLabel}
                            disabled={updating}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Label
                          </Button>
                        ) : order.shipments[0].label_status === 'failed' ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="animate-pulse">Label Failed</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/5 border border-primary/20"
                              onClick={handleRetryLabel}
                              disabled={updating}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" /> Retry Label
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-md border border-border">
                            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Generating Label...
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Incomplete Address Warning */}
              {['CONFIRMED', 'pending'].includes(order.status?.toLowerCase() || order.status) && order.order_type !== 'DIGITAL' && (
                !order.shipping_address ||
                !order.shipping_address.address_line1 ||
                (!order.shipping_address.city && (!order.shipping_address.address_line1 || order.shipping_address.address_line1 === 'Address')) ||
                !(order.shipping_address.postal_code || order.shipping_address.pin || order.shipping_address.pincode) ||
                (!order.shipping_address.phone && !order.shipping_address.address_line1?.includes('Phone'))
              ) && (
                  <p className="text-[11px] font-medium text-destructive flex items-center gap-1.5 bg-destructive/5 px-3 py-1.5 rounded-md border border-destructive/20">
                    <Info className="h-3 w-3" />
                    Address incomplete. Please contact customer or update order before shipping.
                  </p>
                )}
            </div>
          </div>


          <div className="grid lg:grid-cols-3 gap-8 w-full">
            {/* Main Content: Products and Earnings */}
            <div className="lg:col-span-2 space-y-6 min-w-0">

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" /> Products to Fulfill
                  </CardTitle>
                  <CardDescription>Items from this order belonging to your store.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Product Details</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead className="text-right pr-6">Your Payout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="pl-6">
                            <div className="font-medium text-foreground">{item.product_title}</div>
                            <div className="text-xs text-muted-foreground">Unit Price: {formatPrice(item.price)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{item.format.toLowerCase()}</Badge>
                          </TableCell>
                          <TableCell>x{item.quantity}</TableCell>
                          <TableCell className="text-right pr-6 font-bold text-primary">
                            {formatPrice(item.seller_payout)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Payout Breakdown Card */}
              <Card className="bg-background dark:bg-background border-border dark:border-border">
                <CardHeader>
                  <CardTitle className="text-md flex items-center gap-2 text-primary">
                    <IndianRupee className="h-5 w-5" /> Financial Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Gross Sale Amount</span>
                    <span className="font-medium">
                      {formatPrice(order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Platform Commission (Fees)</span>
                    <span>-{formatPrice(order.admin_commission_total)}</span>
                  </div>
                  <Separator className="bg-border" />
                  <div className="flex justify-between font-bold text-xl text-primary">
                    <span>Total Seller Payout</span>
                    <span>{formatPrice(order.seller_payout_total)}</span>
                  </div>
                  <div className="flex items-start gap-2 bg-background/50 p-3 rounded-lg border border-border mt-4">
                    <Info className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">
                      This payout is calculated based on the {order.items[0]?.commission_percentage}% commission rate agreed upon at the time of sale.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: Customer and Logistics */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" /> Customer Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
                      {order.user_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{order.user_name}</p>
                      <p className="text-xs text-muted-foreground">{order.user_email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Shipping Address</p>
                    <div className="flex items-start gap-2 text-sm text-foreground/80">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="leading-relaxed">
                        {order.order_type === 'DIGITAL'
                          ? "No physical address required (E-book Purchase)"
                          : typeof order.shipping_address === 'object'
                            ? (
                              <div className="flex flex-col">
                                <span>{order.shipping_address.address_line1}</span>
                                <span>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.postal_code || order.shipping_address.pin}</span>
                                {order.shipping_address.phone && <span className="pt-1 text-xs text-muted-foreground">Phone: {order.shipping_address.phone}</span>}
                              </div>
                            )
                            : (order.shipping_address || "No address provided")}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  {/* <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Payment Status</span>
                    <Badge variant={order.payment_status === 'PAID' ? 'success' : 'outline'}>
                      {order.payment_status}
                    </Badge>
                  </div> */}
                </CardContent>
              </Card>

              {/* {order.payment && (
                <PaymentInfoCard payment={order.payment} />
              )} */}

              <Card className="bg-primary text-primary-foreground border-none">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" /> Fulfillment Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-3 opacity-90">
                  <p>1. Pack the items securely to avoid damage.</p>
                  <p>2. Print the shipping label from the Admin dashboard if required.</p>
                  <p>3. Once handed to courier, click <b>"Mark as Shipped"</b> to notify the customer.</p>
                </CardContent>
              </Card>

              {/* Shipment Tracking Info for Seller */}
              {order.shipments && order.shipments.length > 0 && (
                <Card className="border-border bg-secondary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-foreground">
                      <Truck className="h-4 w-4" /> {order.shipments[0]?.courier_name || "Logistics"} Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.shipments.map((ship, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">AWB:</span>
                          <span className="font-mono font-bold">{order.awb_number || 'Pending'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Courier:</span>
                          <span>{ship.courier_name || 'Processing'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Pickup Status:</span>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={ship.pickup_status === 'requested' ? 'success' : ship.pickup_status === 'failed' ? 'destructive' : 'outline'}
                              className="h-4 text-[9px] uppercase px-1.5"
                            >
                              {ship.pickup_status || 'Pending'}
                            </Badge>
                            {ship.pickup_status === 'failed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-primary hover:bg-primary/5"
                                onClick={handleRetryPickup}
                                title="Retry Pickup Request"
                              >
                                <RefreshCw className="h-2.5 w-2.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {ship.tracking_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-[10px] h-7 border-border text-primary hover:bg-secondary"
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
                            Tracking Link
                          </Button>
                        )}
                        
                        {/* New: Detailed Tracking Timeline for Sellers */}
                        {ship.tracking_history && ship.tracking_history.length > 0 && (
                          <div className="mt-4 space-y-3 pt-3 border-t border-border/30">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Logistics History</p>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {ship.tracking_history.map((track, trackIdx) => (
                                <div key={trackIdx} className="flex gap-2 text-[10px] items-start">
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1 shrink-0" />
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="font-semibold text-foreground leading-tight">{track.activity}</span>
                                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">{new Date(track.activity_date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
                                    </div>
                                    {track.location && <p className="text-muted-foreground italic">{track.location}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* New: Internal Status History for Sellers */}
              {order.status_history && order.status_history.length > 0 && (
                <Card className="border-border bg-background">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <History className="h-3 w-3" /> Order Lifecycle
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    <div className="space-y-3">
                      {order.status_history.slice(0, 5).map((h, hIdx) => (
                        <div key={hIdx} className="flex gap-2 text-[10px] items-start border-l border-primary/20 ml-1 pl-3 pb-1 last:pb-0">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{h.info || `Status: ${h.admin_status}`}</p>
                            <p className="text-muted-foreground">{new Date(h.created_at).toLocaleString('en-IN', {dateStyle:'short', timeStyle:'short'})}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}