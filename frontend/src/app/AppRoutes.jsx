import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import Maintenance from "../pages/Maintenance";
import InvoicePage from "../pages/InvoicePage";

import {
  Index,
  // ===== Auth =====
  Login, ForgotPassword, OAuthSuccess, SetPassword,
  // ===== Pages =====
  AboutUs, NotFound, SellerAgreement, ShippingPolicy, ContactUs, Blog, Press, Careers,
  HelpCenter, RefundPolicy, TermsOfService, PrivacyPolicy,
  // ===== User =====
  Profile, Addresses, Settings, WishlistPage, MyEbooks, ReadEbook, CustomerDashboard, WalletPage,

  // ===== Orders =====
  Checkout, PhysicalCheckout, DigitalCheckout, OrderReview, OrderInitiating, OrderProcessing, OrderConfirmation, PaymentSuccess, PaymentFailure, TrackOrder, OrderDetail,

  // ===== Products =====
  ProductDetail, Products, BooksPage, NotebooksPage, StationeryPage, Cart, CategoryPage,
  // ===== Seller =====
  SellerRegister, SellerDashboard, SellerAnalytics, SellerProducts, SellerProductAnalytics, SellerOrderDetails, AddProduct, SellerLogistics, SellerProfile, SellerWarehouse,
  // ===== Admin =====
  AdminDashboard, AdminAnalytics, SiteSettings, SellerDetails, AdminUserDetails, AdminOrderDetails, AdminInventoryDetails, AdminLogistics
} from '../index.js';



const AppRoutes = () => {
  return (
    <Routes>
      {/* ---------- Public ---------- */}
      <Route path="/" element={<Index />} />
      <Route path="/products" element={<Products />} />
      <Route path="/books" element={<BooksPage />} />
      <Route path="/category/*" element={<CategoryPage />} />
      <Route path="/notebooks" element={<NotebooksPage />} />
      <Route path="/stationery" element={<StationeryPage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/cart" element={<Cart />} />

      {/* ---------- Auth ---------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/set-password" element={<ProtectedRoute><SetPassword /></ProtectedRoute>} />
      <Route path="/oauth-success" element={<OAuthSuccess />} />

      {/* ---------- Orders ---------- */}
      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
      <Route path="/checkout/physical" element={<ProtectedRoute><PhysicalCheckout /></ProtectedRoute>} />
      <Route path="/checkout/digital" element={<ProtectedRoute><DigitalCheckout /></ProtectedRoute>} />
      <Route path="/order-review" element={<ProtectedRoute><OrderReview /></ProtectedRoute>} />
      <Route path="/order-initiating" element={<ProtectedRoute><OrderInitiating /></ProtectedRoute>} />
      <Route path="/order-processing" element={<ProtectedRoute><OrderProcessing /></ProtectedRoute>} />
      <Route path="/order-confirmation" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/failure" element={<PaymentFailure />} />


      <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
      <Route path="/track-order" element={<TrackOrder />} />

      {/* ---------- User ---------- */}
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/addresses" element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
      <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />

      <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
      <Route path="/my-ebooks" element={<ProtectedRoute role="USER"><MyEbooks /></ProtectedRoute>} />
      <Route path="/dashboard/*" element={<ProtectedRoute role="USER"><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/ebooks/:orderId/read/:productId" element={<ProtectedRoute role="USER"><ReadEbook /></ProtectedRoute>} />
      <Route path="/invoice/:id" element={<InvoicePage />} />

      {/* ---------- Seller ---------- */}
      <Route path="/seller/register" element={<ProtectedRoute><SellerRegister /></ProtectedRoute>} />
      <Route path="/seller" element={<ProtectedRoute role="SELLER"><SellerDashboard /></ProtectedRoute>} />
      <Route path="/seller/analytics" element={<ProtectedRoute role="SELLER"><SellerAnalytics /></ProtectedRoute>} />
      <Route path="/seller/profile" element={<ProtectedRoute role="SELLER"><SellerProfile /></ProtectedRoute>} />
      <Route path="/seller/products" element={<ProtectedRoute role="SELLER"><SellerProducts /></ProtectedRoute>} />
      <Route path="/seller/products/add" element={<AddProduct />} />
      <Route path="/seller/products/:productId/edit" element={<AddProduct />} />
      <Route path="/seller/products/:productId/analytics" element={<ProtectedRoute role="SELLER"><SellerProductAnalytics /></ProtectedRoute>} />
      <Route path="/seller/orders/:id" element={<ProtectedRoute role="SELLER"><SellerOrderDetails /></ProtectedRoute>} />
      <Route path="/seller/logistics" element={<ProtectedRoute role="SELLER"><SellerLogistics /></ProtectedRoute>} />
      <Route path="/seller/warehouse" element={<Navigate to="/seller?tab=store" replace />} />
      {/* ---------- Admin ---------- */}
      <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>}>
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="site-settings" element={<SiteSettings />} />
        <Route path="users/:userId/details" element={<AdminUserDetails />} />
        <Route path="sellers/:sellerId/details" element={<SellerDetails />} />
        <Route path="orders/:orderId/details" element={<AdminOrderDetails />} />
        <Route path="inventory/:productId" element={<AdminInventoryDetails />} />
        {/* Redirect tab-based URLs back to admin dashboard with correct tab param */}
        <Route path="logistics" element={<Navigate to="/admin?tab=logistics" replace />} />
        <Route path="returns" element={<Navigate to="/admin?tab=returns" replace />} />
        <Route path="orders" element={<Navigate to="/admin?tab=orders" replace />} />
        <Route path="sellers" element={<Navigate to="/admin?tab=sellers" replace />} />
        <Route path="users" element={<Navigate to="/admin?tab=users" replace />} />
        <Route path="inventory" element={<Navigate to="/admin?tab=inventory" replace />} />
        <Route path="commission" element={<Navigate to="/admin?tab=commission" replace />} />
        <Route path="shipping-margins" element={<Navigate to="/admin?tab=commission" replace />} />
        <Route path="support" element={<Navigate to="/admin?tab=support" replace />} />
        <Route path="audit" element={<Navigate to="/admin?tab=audit" replace />} />
        <Route path="coupons" element={<Navigate to="/admin?tab=coupons" replace />} />
        <Route path="reward-coins" element={<Navigate to="/admin?tab=reward-coins" replace />} />
        <Route path="ledger" element={<Navigate to="/admin?tab=ledger" replace />} />
        <Route path="abandoned-carts" element={<Navigate to="/admin?tab=abandoned-carts" replace />} />
      </Route>

      {/* ---------- Static ---------- */}
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/privacyPolicy" element={<PrivacyPolicy />} />
      <Route path="/termsOfService" element={<TermsOfService />} />
      <Route path="/refundPolicy" element={<RefundPolicy />} />
      <Route path="/help" element={<HelpCenter />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/press" element={<Press />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/shippingpolicy" element={<ShippingPolicy />} />
      <Route path="/seller-agreement" element={<SellerAgreement />} />

      {/* ---------- Fallback ---------- */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;