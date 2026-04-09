import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, AlertTriangle, ShoppingCart, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentFailure() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const error = searchParams.get('error');
    const source = searchParams.get('source');
    const productId = searchParams.get('product_id');

    const handleTryAgain = () => {
        // Redirect based on source
        if (source === 'product' && productId) {
            navigate(`/product/${productId}`);
        } else {
            navigate('/cart');
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="max-w-md w-full"
            >
                <Card className="shadow-2xl border-border bg-card">
                    <CardHeader className="text-center pt-10">
                        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="h-10 w-10 text-destructive" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Payment Failed</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center pb-8">
                        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6 flex items-start gap-3 text-left">
                            <AlertTriangle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                            <p className="text-sm text-muted-foreground">
                                Your transaction could not be completed. This might be due to insufficient funds, or a temporary issue with the gateway.
                            </p>
                        </div>
                        <p className="text-muted-foreground">
                            Don't worry, no money was deducted. You can try again using a different payment method.
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 pb-10 px-8">
                        <Button className="w-full text-lg h-12" onClick={() => navigate('/cart')}>
                            Try Different Method
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={handleTryAgain}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {source === 'product' && productId ? 'Back to Product' : 'Back to Cart'}
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}