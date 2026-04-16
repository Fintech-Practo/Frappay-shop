import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/config/api';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Truck, CreditCard, Check, AlertCircle, ShoppingBag, ArrowRight, ShieldCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/context/CartContext';
import {Layout} from '@/index.js';
import { resolvePhotoUrl } from '@/utils/url';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal } = useCart();
  const { toast } = useToast();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  // State for session items
  const [sessionData, setSessionData] = useState(null);
  const [loadingSession, setLoadingSession] = useState(!!sessionId);

  useEffect(() => {
    // If using session, fetch it
    if (sessionId) {
      api.get(`/api/checkout/session/${sessionId}`)
        .then(res => {
          if (res.data.success) {
            setSessionData(res.data.data);
          }
        })
        .catch(err => {
          console.error("Failed to load session", err);
          const msg = err.response?.data?.message || err.message || "";
          if (msg.includes("completed")) {
            // Session already used, just redirect without alarming user
            navigate('/dashboard');
          } else {
            toast({ title: "Error", description: "Invalid or expired checkout session", variant: "destructive" });
            navigate('/cart');
          }
        })
        .finally(() => setLoadingSession(false));
    } else {
      // Fallback to Cart
      if (items.length === 0) {
        navigate('/cart');
      }
    }
    fetchAddresses();
  }, [items, navigate, sessionId]);

  // Determine which items to show
  const displayItems = sessionData ? sessionData.items : items;
  const displaySubtotal = sessionData ? sessionData.total_amount : subtotal;
  const shippingCost = displaySubtotal > 499 ? 0 : 40; // Re-applying logic or trust session? Session total usually doesn't include shipping yet.
  const displayTotal = displaySubtotal + shippingCost;


  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await api.get('/api/addresses');
      if (res.data.success) {
        setAddresses(res.data.data || []);
        // Select default address if available, else first one
        const defaultAddr = res.data.data.find(a => a.is_default);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr.id.toString());
        } else if (res.data.data.length > 0) {
          setSelectedAddress(res.data.data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to fetch addresses', error);
      toast({
        title: "Error",
        description: "Failed to load addresses. Please try refreshing.",
        variant: "destructive"
      });
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast({
        title: "Shipping Address Required",
        description: "Please select where you want your books delivered.",
        variant: "destructive"
      });
      return;
    }

    try {
      setPlacingOrder(true);

      const addressObj = addresses.find(a => a.id.toString() === selectedAddress);
      if (!addressObj) throw new Error("Selected address not found");

      const fullAddress = [
        addressObj.full_name,
        addressObj.address_line1,
        addressObj.address_line2,
        `${addressObj.city}, ${addressObj.state} - ${addressObj.postal_code}`,
        `Phone: ${addressObj.phone}`
      ].filter(Boolean).join(', ');

      const orderPayload = {
        shipping_address: fullAddress, // Kept for legacy display compatibility
        address_id: addressObj.id,
        // Also send structured fields explicitly for robustness
        shipping_city: addressObj.city,
        shipping_state: addressObj.state,
        shipping_postal_code: addressObj.postal_code,
        payment_method: paymentMethod
      };

      if (sessionId) {
        orderPayload.session_id = sessionId;
      } else {
        orderPayload.items = items.map(item => ({
          product_id: item.book_id || item.id,
          quantity: item.quantity,
          price: item.price
        }));
      }

      navigate('/order-review', {
        state: {
          orderPayload,
          displayData: {
            items: displayItems
          }
        }
      });

    } catch (error) {
      console.error('Order preparation failed', error);
      toast({
        title: "Error",
        description: "Could not proceed to payment. Please try again.",
        variant: "destructive"
      });
      setPlacingOrder(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Checkout</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary font-medium">Cart</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-primary font-medium">Shipping & Payment</span>
              <ArrowRight className="h-4 w-4" />
              <span>Confirmation</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Forms */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Shipping Address */}
              <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="bg-background border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-muted/30">
                  {loadingAddresses ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <p>Loading your addresses...</p>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-card">
                      <p className="text-muted-foreground mb-4">You haven't added any addresses yet.</p>
                      <Button onClick={() => navigate('/addresses')}>
                        <Plus className="h-4 w-4 mr-2" /> Add New Address
                      </Button>
                    </div>
                  ) : (
                    <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress} className="grid grid-cols-1 gap-4">
                      <AnimatePresence>
                        {addresses.map((addr) => (
                          <label
                            key={addr.id}
                            htmlFor={`addr-${addr.id}`}
                            className={`relative flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-all duration-200 bg-card hover:border-primary/50 hover:shadow-md ${selectedAddress === addr.id.toString() ? 'border-primary ring-1 ring-primary focus-within:ring-2' : 'border-border'}`}
                          >
                            <RadioGroupItem value={addr.id.toString()} id={`addr-${addr.id}`} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-lg text-foreground">{addr.full_name}</span>
                                <Badge variant={addr.label === 'Home' ? 'default' : 'secondary'} className="capitalize">{addr.label || 'Other'}</Badge>
                              </div>
                              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                <p>{addr.address_line1}, {addr.address_line2}</p>
                                <p>{addr.city}, {addr.state} - {addr.postal_code}</p>
                                <p className="font-medium text-foreground/80 pt-1">Phone: {addr.phone}</p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </AnimatePresence>
                      <Button
                        variant="outline"
                        className="mt-2 text-primary hover:text-primary-foreground hover:bg-primary"
                        onClick={() => navigate('/addresses')}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Another Address
                      </Button>
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card className="border shadow-sm">
                <CardHeader className="bg-white border-b pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-muted/30">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">

                    <label htmlFor="upi" className={`flex items - center p - 4 border rounded - xl cursor - pointer transition - all bg - card hover: bg - muted ${paymentMethod === 'upi' ? 'border-primary ring-1 ring-primary' : ''} `}>
                      <RadioGroupItem value="upi" id="upi" className="mr-4" />
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <span className="font-bold text-xs">UPI</span>
                          </div>
                          <div>
                            <p className="font-semibold">UPI / Net Banking</p>
                            <p className="text-xs text-muted-foreground">Google Pay, PhonePe, Paytm</p>
                          </div>
                        </div>
                        {/* <Badge variant="outline" className="ml-2">Demo</Badge> */}
                      </div>
                    </label>

                    <label htmlFor="cod" className={`flex items - center p - 4 border rounded - xl cursor - pointer transition - all bg - card hover: bg - muted ${paymentMethod === 'cod' ? 'border-primary ring-1 ring-primary' : ''} `}>
                      <RadioGroupItem value="cod" id="cod" className="mr-4" />
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">Cash on Delivery</p>
                            <p className="text-xs text-muted-foreground">Pay with cash upon receipt</p>
                          </div>
                        </div>
                      </div>
                    </label>

                  </RadioGroup>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right Column - Order Summary - Sticky */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24 space-y-6">
                <Card className="shadow-lg border-primary/10">
                  <CardHeader className="pb-4 bg-primary/5">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                    <CardDescription>{items.length} Items in cart</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                      {displayItems.map((item, idx) => {
                        // Normalize for display (session items might vary slightly in keys vs cart)
                        const title = item.book_title || item.title || item.book?.title;
                        const imgParams = item.image_url || item.book?.image_url;
                        const imageUrl = resolvePhotoUrl(imgParams?.replace(/\\/g, '/')) || '/placeholder.svg';

                        return (
                          <div key={item.id || idx} className="flex gap-3 group">
                            <div className="h-16 w-12 bg-gray-100 rounded border overflow-hidden flex-shrink-0">
                              <img
                                src={imageUrl}
                                alt={title}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => { e.target.src = '/placeholder.svg'; }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-2 text-foreground/90">{title}</p>
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                <span className="text-sm font-semibold">₹{(item.price || 0) * item.quantity}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <Separator />

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="text-foreground">₹{displaySubtotal}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span className="text-green-600 font-medium">₹{shippingCost}</span>
                      </div>
                      <div className="flex justify-between pt-3 border-t font-bold text-xl">
                        <span>Total</span>
                        <span className="text-primary">₹{displayTotal}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 bg-muted flex flex-col gap-3">
                    <Button
                      size="lg"
                      className="w-full text-lg shadow-lg hover:shadow-primary/20 transition-all"
                      onClick={handlePlaceOrder}
                      disabled={placingOrder || displayItems.length === 0}
                    >
                      {placingOrder ? (
                        <div className="flex items-center gap-2">
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <>Place Order <ArrowRight className="ml-2 h-5 w-5" /></>
                      )}
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" />
                      Secure Checkout
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
