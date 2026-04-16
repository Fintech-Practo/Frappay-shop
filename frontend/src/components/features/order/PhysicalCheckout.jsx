import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/config/api';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Truck, CreditCard, Check, AlertCircle, ShoppingBag, ArrowRight, ShieldCheck, Plus, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/index.js';
import { resolvePhotoUrl } from '@/utils/url';

export default function PhysicalCheckout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('online');

  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [sessionData, setSessionData] = useState(null);
  const [loadingSession, setLoadingSession] = useState(!!sessionId);
  const [shippingDetails, setShippingDetails] = useState(null);
  const [calculatingShipping, setCalculatingShipping] = useState(false);

  // Rewards & Coupons
  const [wallet, setWallet] = useState(null);
  const [useCoins, setUseCoins] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [applyingCoins, setApplyingCoins] = useState(false);
  const [isEligibleForRewards, setIsEligibleForRewards] = useState(true);


  useEffect(() => {
    if (sessionId) {
      api.get(`/api/checkout/session/${sessionId}`)
        .then(res => {
          if (res.data.success) {
            const data = res.data.data;
            // Redirect if session is DIGITAL
            if (data.checkout_kind === 'DIGITAL') {
              navigate(`/checkout/digital?sessionId=${sessionId}`, { replace: true });
              return;
            }
            setSessionData(data);
          }
        })
        .catch(err => {
          console.error("Failed to load session", err);
          const msg = err.response?.data?.message || err.message || "";
          if (msg.includes("completed")) {
            navigate('/dashboard');
          } else {
            toast({ title: "Error", description: "Invalid or expired checkout session", variant: "destructive" });
            navigate('/cart');
          }
        })
        .finally(() => setLoadingSession(false));
    } else {
      navigate('/cart');
    }
    fetchAddresses();
  }, [sessionId, navigate]);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await api.get('/api/wallet');
      if (res.data.success) {
        setWallet(res.data.data);
      }
    } catch (err) {
      console.error("Wallet fetch failed", err);
    }
  };

  useEffect(() => {
    if (sessionData?.items) {
      // Commission Safety Layer (if any item < 15%, disable all rewards)
      const eligible = sessionData.items.every(item => Number(item.seller_commission || 15) >= 15);
      setIsEligibleForRewards(eligible);
    }
  }, [sessionData]);

  const displayItems = sessionData ? sessionData.items : [];
  const displaySubtotal = sessionData ? (sessionData.subtotal || sessionData.product_subtotal || 0) : 0;
  const shippingCost = sessionData ? (sessionData.shipping_charge || 0) : 0;

  // Calculate Discounts from session data (Sync with Backend)
  const coinDiscount = sessionData ? (sessionData.coin_discount || 0) : 0;
  const couponDiscount = sessionData ? (sessionData.coupon_discount || 0) : 0;

  const displayTotal = sessionData ? sessionData.total_amount : (displaySubtotal + shippingCost);

  useEffect(() => {
    if (selectedAddress && sessionId && sessionData?.items?.length) {
      calculateShipping();
    }
  }, [selectedAddress, paymentMethod, sessionId, !!sessionData?.items?.length]);


  const calculateShipping = async () => {
    try {
      if (!selectedAddress || !sessionData?.items?.length) return;

      setCalculatingShipping(true);
      const addressObj = addresses.find(a => a.id.toString() === selectedAddress);

      if (!addressObj || !addressObj.postal_code) {
        console.warn("Cannot calculate shipping: Missing valid address or postal code");
        return;
      }

      const res = await api.post('/api/shipping/calculate', {
        delivery_pincode: addressObj.postal_code,
        cod: paymentMethod === 'cod' ? 1 : 0,
        order_amount: displaySubtotal,
        weight: sessionData.items.reduce((acc, item) => acc + (item.weight || 0.4) * item.quantity, 0.1),
        seller_id: sessionData.items[0]?.seller_id || null  // 🔥 Send seller_id for warehouse lookup
      });

      if (res.data.success) {
        setShippingDetails(res.data.data);

        // Feedback for Delhivery standard fallback rate usage
        if (res.data.data.is_fallback) {
          toast({
            title: "Fallback Shipping Applied",
            description: "Live logistics rates are currently unavailable. Continuing with standard backup rates.",
            variant: "default",
          });
        }

        // SYNC shipping to checkout session so backend knows the grand total
        const addressObj = addresses.find(a => a.id.toString() === selectedAddress);
        const syncRes = await api.post('/api/checkout/session/shipping', {
          sessionId: sessionId,
          shippingData: {
            ...res.data.data,
            address_id: addressObj?.id || null  // 🔥 CRITICAL: Store address_id in session
          }
        });

        if (syncRes.data.success) {
          setSessionData(syncRes.data.data);
        }
      }
    } catch (err) {
      console.error("Shipping calc failed", err);
    } finally {
      setCalculatingShipping(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await api.get('/api/addresses');
      if (res.data.success) {
        setAddresses(res.data.data || []);
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      setCheckingCoupon(true);
      const res = await api.post('/api/checkout/session/apply-coupon', {
        sessionId: sessionId,
        code: couponCode
      });
      if (res.data.success) {
        setSessionData(res.data.data);
        toast({ title: "Coupon Applied", description: `You saved ₹${res.data.data.coupon_discount}!` });
      }
    } catch (err) {
      toast({ title: "Invalid Coupon", description: err.response?.data?.error || "This coupon is not valid.", variant: "destructive" });
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleToggleCoins = async (checked) => {
    try {
      setApplyingCoins(true);
      const coinsToUse = checked ? (wallet?.redeemable_coins || 0) : 0;
      const res = await api.post('/api/checkout/session/apply-coins', {
        sessionId: sessionId,
        coins: coinsToUse
      });
      if (res.data.success) {
        setSessionData(res.data.data);
        setUseCoins(checked);
        if (checked) {
          toast({ title: "Coins Applied", description: `Discount of ₹${res.data.data.coin_discount} applied!` });
        }
      }
    } catch (err) {
      toast({ title: "Error", description: err.response?.data?.error || "Failed to apply coins", variant: "destructive" });
      setUseCoins(false);
    } finally {
      setApplyingCoins(false);
    }
  };

  const handlePlaceOrder = async () => {

    if (!selectedAddress) {
      toast({
        title: "Shipping Address Required",
        description: "Please select where you want your items delivered.",
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
        session_id: sessionId,
        shipping_address: fullAddress,
        address_id: addressObj.id,  // 🔥 CRITICAL: Pass address_id for order creation
        payment_method: paymentMethod,
        // PASS shipping data explicitly for robustness
        shipping_cost: shippingCost,
        shipping_method: shippingDetails?.courier_name || "Standard Shipping",
        estimated_delivery: shippingDetails?.estimated_delivery_days || "5-7 days",
        // Structured address components
        shipping_city: addressObj.city,
        shipping_state: addressObj.state,
        shipping_postal_code: addressObj.postal_code,

        // Rewards & Coupons (Backend handles application, we just send confirmation)
        coins_used: sessionData.applied_coins || 0,
        coin_discount: sessionData.coin_discount || 0,
        coupon_id: sessionData.applied_coupon?.id || null,
        coupon_code: sessionData.applied_coupon?.code || null,
        coupon_discount: sessionData.coupon_discount || 0,
        platform_fee: sessionData.platform_fee || 0,
      };


      navigate('/order-review', {
        state: {
          orderPayload,
          displayData: {
            items: displayItems,
            checkout_kind: 'PHYSICAL',
            shippingDetails: shippingDetails
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

  if (loadingSession) {
    return (
      <Layout>
        <div className="min-h-screen bg-background py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-12 overflow-x-hidden">
        <div className="container max-w-6xl mx-auto px-6 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Checkout - Physical Delivery</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary font-medium">Cart</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-primary font-medium">Shipping & Payment</span>
              <ArrowRight className="h-4 w-4" />
              <span>Confirmation</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 space-y-6"
            >
              <Card className="border border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-card border-b border-border pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary/10 rounded-full text-foreground">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-card/50">
                  {loadingAddresses ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <p>Loading your addresses...</p>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-border rounded-lg bg-card">
                      <p className="text-muted-foreground mb-4">You haven't added any addresses yet.</p>
                      <Button onClick={() => navigate(`/addresses?sessionId=${sessionId}`, { state: { from: 'checkout' } })}>
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
                        onClick={() => navigate(`/addresses?sessionId=${sessionId}`, { state: { from: 'checkout' } })}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Another Address
                      </Button>
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>

              {/* REWARDS & COUPONS */}
              {isEligibleForRewards ? (
                <Card className="border border-border bg-card overflow-hidden shadow-sm">
                  <div className="bg-card p-4 border-b border-border">
                    <CardTitle className="flex items-center gap-3 text-lg text-foreground">
                      <div className="p-1.5 bg-primary/10 rounded-md">
                        <Coins className="h-5 w-5 text-primary" />
                      </div>
                      Rewards & Special Offers
                    </CardTitle>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    {/* Wallet Coins */}
                    {wallet && wallet.coins > 0 && (
                      <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Coins className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">Available Coins: {wallet.redeemable_coins}</p>
                            <p className="text-xs text-muted-foreground font-medium">Worth ₹{Number(wallet.redeemable_value || 0).toFixed(2)} (Valid for 45 days from delivery)</p>
                            {wallet.redeemable_coins < 20 && (
                              <p className="text-xs text-primary font-bold mt-1">Minimum 20 coins required to redeem.</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="use-coins" className={`cursor-pointer font-bold ${wallet.redeemable_coins < 20 ? 'text-foreground' : 'text-primary'} hidden sm:block`}>Apply Coins</Label>
                          <motion.div whileTap={{ scale: wallet.redeemable_coins >= 20 ? 0.9 : 1 }}>
                            <Separator orientation="vertical" className="h-4 mx-2 hidden sm:block" />
                            <input
                              type="checkbox"
                              id="use-coins"
                              checked={useCoins}
                              disabled={applyingCoins || wallet.redeemable_coins < 20}
                              onChange={(e) => handleToggleCoins(e.target.checked)}
                              className="w-6 h-6 rounded-md border-border text-foreground focus:ring-ring cursor-pointer disabled:opacity-50"
                            />
                          </motion.div>
                        </div>
                      </div>
                    )}

                    {/* Coupons */}
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                        Have a promocode?
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            className="w-full px-4 py-2 border border-border bg-background rounded-lg input-focus"
                            placeholder="Enter Code (e.g. WELCOME10)"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          />
                          {sessionData?.applied_coupon && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                              CODE: {sessionData.applied_coupon.code}
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={handleApplyCoupon}
                          disabled={checkingCoupon || !couponCode}
                          className="btn-accent font-bold"
                        >
                          {checkingCoupon ? "..." : "Apply"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                  <div className="text-xs text-gray-500">
                    <p className="font-bold">Rewards Unavailable</p>
                    <p>Some items in your cart have a low seller margin. Coupons and coins cannot be used for this order.</p>
                  </div>
                </div>
              )}

              <Card className="border border-border shadow-sm">

                <CardHeader className="bg-card border-b border-border pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary/10 rounded-full text-foreground">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 bg-card/50">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                    <label htmlFor="online" className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all bg-card hover:bg-muted/50 ${paymentMethod === 'online' ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                      <RadioGroupItem value="online" id="online" className="mr-4" />
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">Online Payment</p>
                            <p className="text-xs text-muted-foreground">Credit/Debit Card, UPI, NetBanking</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">Secure</Badge>
                          <Badge variant="secondary" className="text-xs">Fast</Badge>
                        </div>
                      </div>
                    </label>


                    <label htmlFor="cod" className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all bg-card hover:bg-muted/50 ${paymentMethod === 'cod' ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
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

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24 space-y-6">
                <Card className="shadow-lg border-primary/10">
                  <CardHeader className="pb-4 bg-primary/5">
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                    <CardDescription>{displayItems.length} Items</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                      {displayItems.map((item, idx) => {
                        const title = item.product_title || item.title;
                        const imgParams = item.image_url;
                        const imageUrl = resolvePhotoUrl(imgParams?.replace(/\\/g, '/')) || '/placeholder.svg';

                        return (
                          <div key={item.product_id || idx} className="flex gap-3 group">
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
                        <span className="text-foreground">₹{displaySubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span className={shippingCost === 0 ? "text-green-600 font-medium" : "text-foreground"}>
                          {calculatingShipping ? "Calculating..." : (shippingCost === 0 ? "FREE" : `₹${shippingCost.toFixed(2)}`)}
                        </span>
                      </div>

                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span className="flex items-center gap-1 leading-none">Coupon Discount</span>
                          <span>- ₹{couponDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      {coinDiscount > 0 && (
                        <div className="flex justify-between text-amber-600 font-medium">
                          <span className="flex items-center gap-1 leading-none underline decoration-dotted underline-offset-2">Coins Applied</span>
                          <span>- ₹{coinDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      {shippingDetails && (
                        <p className="text-[10px] text-muted-foreground bg-muted/50 p-1.5 rounded border border-border border-dashed text-center">
                          Est. Delivery: {shippingDetails.estimated_delivery_days} days via {shippingDetails.courier_name}
                        </p>
                      )}

                      {sessionData?.platform_fee > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span className="flex items-center gap-1 leading-none">Platform Fee</span>
                          <span>+ ₹{sessionData.platform_fee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-3 border-t font-bold text-xl">
                        <span>Total</span>
                        <span className="text-primary">₹{displayTotal.toFixed(2)}</span>
                      </div>

                    </div>
                  </CardContent>
                  <CardFooter className="p-4 bg-muted/20 border-t border-border flex flex-col gap-3">
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
