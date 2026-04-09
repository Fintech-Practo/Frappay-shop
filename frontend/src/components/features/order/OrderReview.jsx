import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, CreditCard, ShieldCheck, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useEffect } from 'react';
import { Layout } from '@/index.js';


export default function OrderReview() {
    const navigate = useNavigate();
    const location = useLocation();
    const { orderPayload } = location.state || {}; // Expecting payload from Checkout

    useEffect(() => {
        if (!orderPayload) {
            navigate('/cart');
        }
    }, [orderPayload, navigate]);

    if (!orderPayload) return null;



    const { displayData } = location.state || {};
    const items = displayData?.items || [];
    const address = orderPayload.shipping_address;
    const paymentMethod = orderPayload.payment_method;
    const shippingDetails = displayData?.shippingDetails || null;

    const subtotal = items.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
    const isDigital = displayData?.checkout_kind === 'DIGITAL';
    const shipping = isDigital ? 0 : (orderPayload.shipping_cost !== undefined ? orderPayload.shipping_cost : (shippingDetails ? shippingDetails.total_charge : 49));

    const couponDiscount = orderPayload.coupon_discount || 0;
    const coinDiscount = orderPayload.coin_discount || 0;
    const platformFee = orderPayload.platform_fee || 0;

    const total = subtotal + shipping + platformFee - couponDiscount - coinDiscount;


    const handleConfirmOrder = () => {
        // Navigate to initiating which handles the API call and redirects
        navigate('/order-initiating', {
            state: { orderPayload }
        });
    };


    return (
        <Layout>
            <div className="min-h-screen bg-background py-12 text-foreground">
                <div className="container max-w-6xl mx-auto px-6">
                    <div className="mb-8">
                        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Checkout
                        </Button>
                        <h1 className="text-3xl font-bold mb-2">Review Your Order</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Checkout</span>
                            <ArrowRight className="h-4 w-4" />
                            <span className="text-primary font-medium">Review</span>
                            <ArrowRight className="h-4 w-4" />
                            <span>Confirmation</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-6">

                            {/* Items Review */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShoppingBag className="h-5 w-5 text-primary" />
                                        Items ({items.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="divide-y">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="py-4 flex gap-4 first:pt-0 last:pb-0">
                                            <div className="h-20 w-16 bg-muted rounded border overflow-hidden flex-shrink-0">
                                                {item.image_url || item.book_image ? (
                                                    <img
                                                        src={item.image_url || item.book_image}
                                                        alt={item.title || item.book_title}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = '/placeholder.svg';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No Img</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold line-clamp-1">{item.title || item.book_title}</h4>
                                                <p className="text-sm text-muted-foreground mb-2">Qty: {item.quantity}</p>
                                                <p className="font-medium">₹{(item.price || 0) * item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Shipping Review */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-primary" />
                                        Shipping To
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="whitespace-pre-line leading-relaxed text-foreground/80">
                                        {address ? address.replace(/, /g, '\n') : 'No address selected'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Payment Review */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-primary" />
                                        Payment Method
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                        {paymentMethod === 'cod' ? (
                                            <>
                                                <div className="h-10 w-10 bg-green-500/10 text-green-500 rounded flex items-center justify-center">
                                                    <ShoppingBag className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Cash on Delivery</p>
                                                    <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-10 w-10 bg-blue-500/10 text-blue-500 rounded flex items-center justify-center">
                                                    <CreditCard className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Online Payment</p>
                                                    <p className="text-xs text-muted-foreground">UPI / Net Banking</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Sticky Sidebar */}
                        <div className="md:col-span-1">
                            <div className="sticky top-24">
                                <Card className="shadow-lg border-primary/20">
                                    <CardHeader className="bg-primary/5 pb-4">
                                        <CardTitle>Order Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Subtotal</span>
                                            <span>₹{subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Shipping</span>
                                            <span className={isDigital ? "text-green-600 font-medium" : "text-foreground"}>
                                                {isDigital ? "FREE" : `₹${shipping.toFixed(2)}`}
                                            </span>
                                        </div>

                                        {platformFee > 0 && (
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>Platform Fee</span>
                                                <span>₹{platformFee.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {couponDiscount > 0 && (
                                            <div className="flex justify-between text-green-600 font-medium">
                                                <span>Coupon Discount</span>
                                                <span>- ₹{couponDiscount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {coinDiscount > 0 && (
                                            <div className="flex justify-between text-amber-600 font-medium">
                                                <span>Coins Redemption</span>
                                                <span>- ₹{coinDiscount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <Separator />

                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Total Payble</span>
                                            <span className="text-primary">₹{total.toFixed(2)}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-4 bg-muted/10 p-6 border-t border-border">
                                        <Button size="lg" className="w-full text-lg shadow-lg hover:shadow-primary/25 transition-all" onClick={handleConfirmOrder}>
                                            Confirm Order <ShieldCheck className="ml-2 h-5 w-5" />
                                        </Button>
                                        <p className="text-xs text-center text-muted-foreground px-4">
                                            By confirming, you agree to our Terms of Service and Privacy Policy.
                                        </p>
                                    </CardFooter>
                                </Card>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
}