import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Tag,
  Truck,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/config/api';
import { Layout } from '@/index.js';

export default function Cart() {
  const MIN_ORDER_VALUE = 100;
  const FREE_SHIPPING_THRESHOLD = 1500;
  const { items, updateQuantity, removeItem } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('physical'); // 'physical' or 'digital'

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price || 0);
  };

  const isDigital = (item) => {
    // Primary check: if we explicitly chose a digital format
    if (item.purchase_format === 'EBOOK' || item.purchase_format === 'DIGITAL') return true;
    if (item.purchase_format === 'PHYSICAL') return false;

    // Fallback: Check if the product itself is ONLY digital
    return (
      item.format === 'EBOOK' ||
      item.product_type_code === 'EBOOK' ||
      item.format === 'DIGITAL'
    );
  };

  const physicalItems = items.filter(item => !isDigital(item));
  const digitalItems = items.filter(item => isDigital(item));

  // Auto-switch tab if one category is empty and the other isn't
  useEffect(() => {
    if (physicalItems.length === 0 && digitalItems.length > 0) {
      setActiveTab('digital');
    }
  }, [items]);

  const calculateSubtotal = (itemList) => itemList.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const physicalSubtotal = calculateSubtotal(physicalItems);
  const digitalSubtotal = calculateSubtotal(digitalItems);

  const handleCheckout = async (type) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=cart`);
      return;
    }

    const targetItems = type === 'physical' ? physicalItems : digitalItems;
    if (targetItems.length === 0) return;

    setCheckingOut(true);
    try {
      const sessionPayload = {
        items: targetItems.map(item => ({
          product_id: item.product_id || item.book_id || item.id,
          quantity: item.quantity,
          purchase_format: item.purchase_format || (type === 'digital' ? 'EBOOK' : 'PHYSICAL')
        })),
        source: 'cart'
      };

      const response = await api.post('/api/checkout/session', sessionPayload);
      if (response.data.success) {
        const { sessionId, checkout_kind } = response.data.data;
        if (checkout_kind === 'DIGITAL') {
          navigate(`/checkout/digital?sessionId=${sessionId}`);
        } else {
          navigate(`/checkout/physical?sessionId=${sessionId}`);
        }
      }
    } catch (error) {
      console.error(`${type} checkout failed`, error);
      alert("Failed to proceed to checkout: " + (error.response?.data?.message || error.message));
    } finally {
      setCheckingOut(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container-custom py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto"
          >
            <div className="p-6 bg-muted/50 rounded-full w-fit mx-auto mb-6">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30" />
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link to="/products">
              <Button size="lg" className="rounded-full px-8">
                Start Shopping
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const currentItems = activeTab === 'physical' ? physicalItems : digitalItems;
  const currentSubtotal = activeTab === 'physical' ? physicalSubtotal : digitalSubtotal;
  const currentTotal = currentSubtotal; // Shipping calculated at checkout step now

  return (
    <Layout>
      <div className="container-custom py-12">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-2">Shopping Cart</h1>
            <p className="text-muted-foreground">Manage and checkout your items separately.</p>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex bg-muted/50 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('physical')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'physical'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <ShoppingBag className="h-4 w-4" />
              Physical Items
              {physicalItems.length > 0 && (
                <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                  {physicalItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('digital')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'digital'
                ? 'bg-background text-accent shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <FileText className="h-4 w-4" />
              Digital Goods
              {digitalItems.length > 0 && (
                <span className="bg-accent/10 text-accent text-[10px] px-1.5 py-0.5 rounded-full">
                  {digitalItems.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4 min-h-[400px]">
            <AnimatePresence mode="wait">
              {currentItems.length > 0 ? (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {currentItems.map((item, index) => {
                    const title = item.book?.title || item.title || "Unknown Title";
                    const author = item.book?.author || item.author;
                    const image = item.book?.image_url || item.images?.[0] || item.image_url;
                    const imageUrl = image && !image.startsWith('http') ? `http://localhost:5000/${image.replace(/\\/g, '/')}` : (image || '/placeholder.svg');
                    const price = item.price;
                    const id = item.id;

                    return (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-4 p-5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group"
                      >
                        <Link to={`/product/${item.product_id || item.id}`} className="shrink-0">
                          <img
                            src={imageUrl}
                            alt={title}
                            className="w-24 h-32 object-cover rounded-xl shadow-sm group-hover:scale-[1.02] transition-transform"
                            onError={(e) => { e.target.src = '/placeholder.svg'; }}
                          />
                        </Link>

                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex justify-between items-start gap-2">
                            <Link to={`/product/${item.product_id || item.id}`}>
                              <h3 className="font-semibold text-lg text-foreground hover:text-primary transition-colors line-clamp-1">
                                {title}
                              </h3>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeItem(id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {author && <p className="text-sm text-muted-foreground mb-4">by {author}</p>}

                          <div className="mt-auto flex items-center justify-between">
                            {isDigital(item) ? (
                              <div className="flex items-center gap-1.5 text-accent bg-accent/5 px-3 py-1.5 rounded-lg border border-accent/20">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Digital License</span>
                              </div>
                            ) : (
                              <div className="flex items-center border border-border rounded-xl bg-background shadow-inner">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => updateQuantity(id, (item.quantity || 1) - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-10 text-center text-sm font-bold">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={() => updateQuantity(id, (item.quantity || 1) + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <div className="text-right">
                              <p className="text-xl font-display font-bold text-foreground">
                                {formatPrice(price * (isDigital(item) ? 1 : item.quantity))}
                              </p>
                              {!isDigital(item) && item.quantity > 1 && (
                                <p className="text-xs text-muted-foreground">{formatPrice(price)} each</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key={`empty-${activeTab}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full py-12 text-center"
                >
                  <p className="text-muted-foreground mb-4">No {activeTab} items in your cart.</p>
                  <Button variant="outline" onClick={() => setActiveTab(activeTab === 'physical' ? 'digital' : 'physical')}>
                    Switch to {activeTab === 'physical' ? 'Digital' : 'Physical'} Cart
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Checkout Panel */}
          <div className="lg:col-span-1 lg:sticky lg:top-24">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="font-bold text-xl mb-6">Summary</h3>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-medium text-foreground">{formatPrice(currentSubtotal)}</span>
                </div>

                {activeTab === 'physical' && (
                  <>
                    <div className="flex justify-between items-center text-muted-foreground pt-1">
                      <span className="flex items-center gap-1.5"><Truck className="h-4 w-4" /> Shipping</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${currentSubtotal > FREE_SHIPPING_THRESHOLD 
                        ? 'text-success bg-success/5 border-success/20' 
                        : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                        {currentSubtotal > FREE_SHIPPING_THRESHOLD ? 'FREE' : 'Calculated at checkout'}
                      </span>
                    </div>
                    {currentSubtotal <= FREE_SHIPPING_THRESHOLD && (
                      <p className="text-[10px] text-primary bg-primary/5 p-2 rounded-lg border border-primary/10 mt-2">
                        Add {formatPrice(FREE_SHIPPING_THRESHOLD - currentSubtotal + 1)} more for <strong>FREE Shipping & NO COD Charge!</strong>
                      </p>
                    )}
                  </>
                )}

                {activeTab === 'digital' && (
                  <div className="flex justify-between text-muted-foreground">
                    <span className="flex items-center gap-1 text-accent"><Tag className="h-4 w-4" /> Digital Tax</span>
                    <span className="text-success font-medium">Included</span>
                  </div>
                )}
              </div>

              <Separator className="my-6" />

              <div className="flex justify-between items-center mb-8">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Payable</p>
                  <span className="text-3xl font-display font-bold text-foreground">
                    {formatPrice(currentTotal)}
                  </span>
                </div>
              </div>

              {activeTab === 'physical' && currentSubtotal < MIN_ORDER_VALUE && (
                <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-xl flex items-center gap-2 text-destructive">
                  <Tag className="h-4 w-4 shrink-0" />
                  <p className="text-xs font-semibold">Minimum order value for physical products is {formatPrice(MIN_ORDER_VALUE)}. Please add more items.</p>
                </div>
              )}

              <Button
                size="lg"
                className={`w-full py-7 rounded-xl text-lg font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] ${activeTab === 'physical' ? 'btn-primary' : 'btn-accent'
                  }`}
                onClick={() => handleCheckout(activeTab)}
                disabled={checkingOut || currentItems.length === 0 || (activeTab === 'physical' && currentSubtotal < MIN_ORDER_VALUE)}
              >
                {checkingOut ? 'Processing...' : `Checkout ${activeTab === 'physical' ? 'Physical' : 'Digital'}`}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <p className="mt-4 text-[11px] text-center text-muted-foreground">
                {activeTab === 'physical'
                  ? "Shipping charges are calculated at checkout only."
                  : "Digital downloads will be available instantly in your dashboard after purchase."
                }
              </p>
            </div>

            <Link to="/products" className="block mt-6">
              <Button variant="ghost" className="w-full hover:bg-primary/5 text-primary rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Add More Items
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
