import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Package, ShoppingBag, Download, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import confetti from 'canvas-confetti';
import { useToast } from '@/components/ui/use-toast';
import { orderService } from '@/index.js';

export default function OrderConfirmation() {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { order } = location.state || {};
    const [countdown, setCountdown] = useState(10); // Auto-redirect countdown if needed, or just cosmetic

    useEffect(() => {
        if (!order) {
            navigate('/dashboard');
            return;
        }

        // Fire Confetti
        const end = Date.now() + 3 * 1000;
        const colors = ['#e11d48', '#ffffff'];

        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());

    }, [order, navigate]);


    const handleDownloadInvoice = async () => {
        if (!order) return;
        try {
            const invoiceUrl = await orderService.getInvoiceUrl(order.id);
            if (invoiceUrl) {
                window.open(invoiceUrl, '_blank');
                toast({ title: "Success", description: "Invoice downloaded successfully." });
            } else {
                throw new Error("Invoice URL missing");
            }
        } catch (error) {
            console.error("Invoice generation failed", error);
            toast({
                title: "Download Failed",
                description: "Could not retrieve invoice.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-xl w-full"
            >
                <Card className="shadow-2xl border-none overflow-hidden">
                    {/* Success Header Area */}
                    <div className="bg-primary/5 p-8 text-center border-b border-primary/10">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                            className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"
                        >
                            <CheckCircle className="h-12 w-12 text-green-500" />
                        </motion.div>
                        <h1 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">Order Confirmed!</h1>
                        <p className="text-muted-foreground text-lg">
                            Thank you for your purchase. We've received your order.
                        </p>
                    </div>
                    <CardContent className="p-8 space-y-8 bg-card">
                        {/* Key Details Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/20 transition-colors">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Order #</p>
                                <p className="text-lg font-mono font-bold text-foreground">{order.id}</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/20 transition-colors">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Amount</p>
                                <p className="text-lg font-bold text-primary">₹{parseFloat(order.grand_total || order.total_amount).toFixed(2)}</p>
                                {order.shipping_cost > 0 && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        (Includes ₹{parseFloat(order.shipping_cost).toFixed(2)} shipping)
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Order Timeline / Next Steps Visual */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-foreground mb-6">What happens next?</h3>
                            <div className="relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[24px] top-6 h-[56px] w-[2px] bg-border"></div>

                                {/* Step 1 */}
                                <div className="relative flex items-start gap-4 mb-8">
                                    <div className="relative z-10 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                                        <CheckCircle className="h-6 w-6" />
                                    </div>
                                    <div className="pt-2">
                                        <h4 className="font-bold text-foreground">Order Placed</h4>
                                        <p className="text-sm text-muted-foreground">We have received your order details.</p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="relative flex items-start gap-4">
                                    <div className="relative z-10 w-12 h-12 rounded-full bg-card border-2 border-primary text-primary flex items-center justify-center shrink-0">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div className="pt-2">
                                        <h4 className="font-semibold text-foreground">Processing</h4>
                                        <p className="text-sm text-muted-foreground">We are preparing your items for shipment.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator className="my-6" />

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <Button asChild size="lg" className="h-14 w-full text-lg shadow-primary/25 shadow-lg hover:shadow-primary/40 transition-all">
                                <Link to={`/orders/${order.id}`}>
                                    <Package className="mr-2 h-5 w-5" /> View Order Details
                                </Link>
                            </Button>

                            <Button variant="outline" size="lg" className="h-12 w-full" onClick={handleDownloadInvoice}>
                                <Download className="mr-2 h-5 w-5" /> Download Invoice
                            </Button>

                            <Button asChild variant="ghost" size="lg" className="h-12 w-full text-foreground hover:text-foreground">
                                <Link to="/products">
                                    Continue Shopping <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <p className="text-center text-xs text-muted-foreground mt-8">
                    Need help? <Link to="/contact" className="underline hover:text-foreground">Contact Support</Link>
                </p>
            </motion.div>
        </div>
    );
}