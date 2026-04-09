import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/config/api';
import { motion } from 'framer-motion';
import { Download, CreditCard, ArrowRight, ShieldCheck, CheckCircle, Coins, AlertCircle, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Layout } from '@/index.js';


export default function DigitalCheckout() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [paymentMethod, setPaymentMethod] = useState('online');

  const [placingOrder, setPlacingOrder] = useState(false);

  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [sessionData, setSessionData] = useState(null);
  const [loadingSession, setLoadingSession] = useState(!!sessionId);

  // Rewards & Coupons
  const [wallet, setWallet] = useState(null);
  const [useCoins, setUseCoins] = useState(false);
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
            // Redirect if session is PHYSICAL
            if (data.checkout_kind === 'PHYSICAL') {
              navigate(`/checkout/physical?sessionId=${sessionId}`, { replace: true });
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
    fetchWallet();
  }, [sessionId, navigate]);

  useEffect(() => {
    if (sessionData?.items) {
      const eligible = sessionData.items.every(item => Number(item.commission_percentage || 15) >= 15);
      setIsEligibleForRewards(eligible);
    }
  }, [sessionData]);

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

  const displayItems = sessionData ? sessionData.items : [];
  const displaySubtotal = sessionData ? (sessionData.subtotal || sessionData.product_subtotal || 0) : 0;

  // Calculate Discounts from session data
  const coinDiscount = sessionData ? (sessionData.coin_discount || 0) : 0;
  const couponDiscount = sessionData ? (sessionData.coupon_discount || 0) : 0;

  const displayTotal = sessionData ? sessionData.total_amount : displaySubtotal;

  const handlePlaceOrder = async () => {
    try {
      setPlacingOrder(true);

      const orderPayload = {
        session_id: sessionId,
        shipping_address: "", // Not required for digital
        payment_method: paymentMethod,

        // Rewards & Coupons
        coins_used: sessionData.applied_coins || 0,
        coin_discount: sessionData.coin_discount || 0,
        coupon_id: sessionData.applied_coupon?.id || null,
        coupon_code: sessionData.applied_coupon?.code || null,
        coupon_discount: sessionData.coupon_discount || 0
      };

      navigate('/order-review', {
        state: {
          orderPayload,
          displayData: {
            items: displayItems,
            checkout_kind: 'DIGITAL'
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
            <h1 className="text-3xl font-bold mb-2">Checkout - Digital Download</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary font-medium">Cart</span>
              <ArrowRight className="h-4 w-4" />
              <span className="text-primary font-medium">Payment</span>
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
              <Card className="border border-border shadow-sm overflow-hidden bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/5 dark:to-indigo-500/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Download className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">Instant Digital Delivery</h3>
                      <p className="text-sm text-muted-foreground">
                        Your digital items will be available for download immediately after order confirmation.
                        No shipping address required.
                      </p>
                    </div>
                  </div>
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
                              <p className="text-xs text-red-500 font-bold mt-1">Minimum 20 coins required to redeem.</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="use-coins-digital" className={`cursor-pointer font-bold ${wallet.redeemable_coins < 20 ? 'text-foregound' : 'text-primary'} hidden sm:block`}>Apply Coins</Label>
                          <motion.div whileTap={{ scale: wallet.redeemable_coins >= 20 ? 0.9 : 1 }}>
                            <Separator orientation="vertical" className="h-4 mx-2 hidden sm:block" />
                            <input
                              type="checkbox"
                              id="use-coins-digital"
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
                    <label htmlFor="online-digital" className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all bg-card hover:bg-muted/50 ${paymentMethod === 'online' ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                      <RadioGroupItem value="online" id="online-digital" className="mr-4" />
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
                          <Badge variant="secondary" className="text-xs">Instant</Badge>
                        </div>
                      </div>
                    </label>

                  </RadioGroup>
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-500 font-medium">
                      <CheckCircle className="h-4 w-4 inline mr-2" />
                      Digital purchases require online payment. Cash on Delivery is not available for digital items.
                    </p>
                  </div>
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
                    <CardDescription>{displayItems.length} Digital Items</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                      {displayItems.map((item, idx) => {
                        const title = item.product_title || item.title;
                        const imgParams = item.image_url;
                        const imageUrl = imgParams ? (imgParams.startsWith('http') ? imgParams : `http://localhost:5000/${imgParams.replace(/\\/g, '/')}`) : '/placeholder.svg';

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
                              <Badge variant="outline" className="mt-1 text-xs">Digital</Badge>
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

                      <div className="flex justify-between text-muted-foreground">
                        <span>Shipping</span>
                        <span className="text-green-600 font-medium">Free</span>
                      </div>
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