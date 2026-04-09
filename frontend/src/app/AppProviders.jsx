import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

// ===== UI =====
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// ===== Context Providers =====
import { AuthProvider } from "../context/AuthContext";
import { PreferenceProvider } from "../context/PreferenceContext";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { ReviewProvider } from "../context/ReviewContext";
import { ProductProvider } from "../context/ProductContext";

// ===== Scroll Utility =====
import ScrollToTopOnNavigation from "./ScrollToTopOnNavigation";

const queryClient = new QueryClient();

const AppProviders = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferenceProvider>
          <SiteSettingsProvider>
            <CartProvider>
              <WishlistProvider>
                <ReviewProvider>
                  <ProductProvider>
                    <TooltipProvider>
                      <Toaster />
                      <Sonner />

                      <BrowserRouter>
                        <ScrollToTopOnNavigation />
                        {children}
                      </BrowserRouter>
                    </TooltipProvider>
                  </ProductProvider>
                </ReviewProvider>
              </WishlistProvider>
            </CartProvider>
          </SiteSettingsProvider>
        </PreferenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
