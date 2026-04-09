import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/config/api';
import { motion } from 'framer-motion';
import { Loader2, XCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useCart } from '@/context/CartContext';

export default function OrderProcessing() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast } = useToast();
    const { refreshCart } = useCart();
    const txnid = searchParams.get('txnid');


    const [error, setError] = useState(null);
    const [status, setStatus] = useState('Verifying your payment...');
    const pollingRef = useRef(false);
    const retryCountRef = useRef(0);
    const MAX_RETRIES = 10; // 2 seconds * 10 = 20 seconds max wait

    useEffect(() => {
        if (!txnid) {
            navigate('/cart');
            return;
        }

        const pollOrderStatus = async () => {
            if (pollingRef.current) return;
            pollingRef.current = true;

            try {
                // Poll the payment session status
                const res = await api.get(`/api/payment/session/${txnid}`);
                const session = res.data.data;

                if (session.status === 'PAID' && session.order_id) {
                    // Success! Fetch the full order details and navigate
                    setStatus('Order confirmed! Finalizing...');
                    const orderRes = await api.get(`/api/orders/${session.order_id}`);

                    if (refreshCart) await refreshCart();
                    navigate('/order-confirmation', {
                        state: { order: orderRes.data.data },
                        replace: true
                    });

                    return;
                }

                if (session.status === 'FAILED') {
                    setError("Payment failed. Please try again or contact support.");
                    return;
                }

                // If still pending, retry after delay
                if (retryCountRef.current < MAX_RETRIES) {
                    retryCountRef.current += 1;
                    setStatus(retryCountRef.current > 3 ? 'Finalizing secure order creation...' : 'Verifying your payment...');

                    setTimeout(() => {
                        pollingRef.current = false;
                        pollOrderStatus();
                    }, 2000);
                } else {
                    setError("Synchronization is taking longer than expected. Please check 'My Orders' in a few minutes.");
                }

            } catch (err) {
                console.error("Polling error:", err);
                const msg = err.response?.data?.message || err.message;
                setError(msg);
                toast({
                    title: "Status Check Failed",
                    description: msg,
                    variant: "destructive"
                });
            }
        };

        pollOrderStatus();
    }, [txnid, navigate, toast]);

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border-destructive/20">
                    <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-xl text-destructive">Wait, something happened.</CardTitle>
                        <CardDescription className="text-base text-gray-600 mt-2">
                            {error}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center pb-6 gap-3">
                        <Button onClick={() => navigate('/dashboard')} variant="default" size="lg">
                            Go to Dashboard
                        </Button>
                        <Button onClick={() => navigate('/help')} variant="outline" size="lg">
                            Help Center
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-6 max-w-sm w-full"
            >
                <div className="relative inline-block">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="relative bg-background p-4 rounded-full shadow-lg"
                    >
                        <Loader2 className="h-12 w-12 text-primary" />
                    </motion.div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight">{status}</h2>
                    <p className="text-muted-foreground text-sm">We are syncing with the bank and securing your order. Please don't leave this page.</p>
                </div>

                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 20, ease: "linear" }}
                    />
                </div>

                {/* <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-50">
                    <ShieldCheck className="h-3 w-3" />
                    Encrypted Protocol
                </div> */}
            </motion.div>
        </div>
    );
}