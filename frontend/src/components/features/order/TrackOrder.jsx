import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {Layout} from '@/index.js';

export default function TrackOrder() {
  const [orderId, setOrderId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (orderId.trim()) {
      navigate(`/orders/${orderId.trim()}`);
    }
  };

  return (
    <Layout>
      <div className="container py-20 flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 mb-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 shadow-sm">
            <Package className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Track Your Order</h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            Enter your Order ID below to check the real-time status of your package.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border-primary/20 bg-card/80 backdrop-blur-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Order Lookup</CardTitle>
              <CardDescription>
                Find your order details instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Enter Order ID (e.g., 123)"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="pl-10 h-12 text-lg border-muted-foreground/20 focus-visible:ring-primary/30"
                      type="number"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-lg font-semibold shadow-lg hover:shadow-primary/25 transition-all"
                  disabled={!orderId.trim()}
                >
                  Track Order <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <div className="p-4 rounded-lg bg-muted/50 inline-block">
            <p className="text-sm text-muted-foreground">
              Logged in? <Button variant="link" className="text-primary px-1 font-semibold h-auto p-0" onClick={() => navigate('/dashboard')}>Go to My Orders</Button> to see your history.
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
