import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '@/config/api';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { redirectToPayU } from '@/lib/payuRedirect';
import { useCart } from '@/context/CartContext';

export default function OrderInitiating() {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { refreshCart } = useCart();
    const { orderPayload } = location.state || {};

    const [status, setStatus] = useState('Securing session...');
    const initiatedRef = useRef(false);

    useEffect(() => {
        if (!orderPayload) {
            navigate('/cart');
            return;
        }

        const initiateFlow = async () => {
            if (initiatedRef.current) return;
            initiatedRef.current = true;

            console.log("🔥 [Frontend] Initiating for payload:", orderPayload);

            try {
                // Small delay for UI/UX feel
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (orderPayload.payment_method === 'cod') {
                    setStatus('Creating your order...');
                    const res = await api.post('/api/orders', orderPayload);
                    if (res.data.success) {
                        if (refreshCart) await refreshCart();
                        navigate('/order-confirmation', {

                            state: { order: res.data.data },
                            replace: true
                        });
                    }
                } else {
                    setStatus('Redirecting to secure gateway...');
                    const res = await api.post('/api/payment/initiate', {
                        checkoutSessionId: orderPayload.session_id,
                        shippingAddress: orderPayload.shipping_address,
                        address_id: orderPayload.address_id,

                        // Pass shipping data explicitly for robust totals
                        shipping_cost: orderPayload.shipping_cost,
                        shipping_method: orderPayload.shipping_method,
                        estimated_delivery: orderPayload.estimated_delivery,

                        // Structured address components
                        shipping_city: orderPayload.shipping_city,
                        shipping_state: orderPayload.shipping_state,
                        shipping_postal_code: orderPayload.shipping_postal_code,

                        // Rewards & Coupons
                        coins_used: orderPayload.coins_used || 0,
                        coin_discount: orderPayload.coin_discount || 0,
                        coupon_id: orderPayload.coupon_id || null,
                        coupon_code: orderPayload.coupon_code || null,
                        coupon_discount: orderPayload.coupon_discount || 0
                    });



                    if (res.data.success) {
                        // The backend returns PayU params + action URL
                        redirectToPayU(res.data.data);
                    } else {
                        throw new Error(res.data.message || "Failed to initiate payment");
                    }
                }
            } catch (err) {
                initiatedRef.current = false;
                const msg = err.response?.data?.message || err.message;
                toast({
                    title: "Initialization Failed",
                    description: msg,
                    variant: "destructive"
                });
                navigate('/order-review', { state: { orderPayload }, replace: true });
            }
        };

        initiateFlow();
    }, [orderPayload, navigate, toast]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border overflow-hidden"
            >
                <div className="p-8 text-center space-y-6">
                    <div className="relative inline-block mx-auto">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                        <div className="relative bg-card p-4 rounded-full shadow-md border border-border">
                            {status.includes('Creating') ? (
                                <ShieldCheck className="h-10 w-10 text-green-500" />
                            ) : (
                                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">
                            {status === 'Initializing...' ? 'Securing Connection...' : status}
                        </h2>
                        <p className="text-muted-foreground text-sm px-4">
                            Please do not close this window or press back. We are securely transferring you to the payment gateway.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}