import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const txnid = searchParams.get('txnid');

    useEffect(() => {
        // Redirect to processing after a short "Success" visual
        const timer = setTimeout(() => {
            navigate(`/order-processing?txnid=${txnid}`, { replace: true });
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigate, txnid]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-6"
            >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-background shadow-lg">
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>

                <h1 className="text-3xl font-bold text-foreground">Payment Received!</h1>
                <p className="text-muted-foreground max-w-xs mx-auto">
                    Your payment was successful. We are now finalizing your order details.
                </p>

                <div className="flex items-center justify-center gap-3 text-sm font-medium text-primary bg-primary/5 py-3 px-6 rounded-full inline-flex mx-auto">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalizing Order...
                </div>
            </motion.div>
        </div>
    );
}