import AboutUs from './components/common_pages/AboutUs';
import Addresses from './components/common_pages/Addresses';
import Blog from './components/common_pages/Blog';
import Careers from './components/common_pages/Careers';
import ContactUs from './components/common_pages/ContactUs';
import ForgotPassword from './components/common_pages/ForgotPassword';
import HelpCenter from './components/common_pages/HelpCenter';
import Login from './components/common_pages/Login';
import NotFound from './components/common_pages/NotFound';
import OAuthSuccess from './components/common_pages/OAuthSuccess';
import Press from './components/common_pages/Press';
import PrivacyPolicy from './components/common_pages/PrivacyPolicy';
import RefundPolicy from './components/common_pages/RefundPolicy';
import ShippingPolicy from './components/common_pages/ShippingPolicy';
import SetPassword from './components/common_pages/SetPassword';
import Settings from './components/common_pages/Settings';
import TermsOfService from './components/common_pages/TermsOfService';

import ChatBot from './components/chatbot/ChatBot';

import UserTable from './components/features/admin/components/UserTable';
import SellerTable from './components/features/admin/components/SellerTable';
import ReviewModeration from './components/features/admin/components/ReviewModeration';
import OrderTable from './components/features/admin/components/OrderTable';
import AdminOrderLedger from './components/features/admin/components/AdminOrderLedger';
import AdminSellerPayoutLedger from './components/features/admin/components/AdminSellerPayoutLedger';
import AdminAccountSettings from './components/features/admin/components/AdminAccountSettings';
import AdminInventoryDetails from './components/features/admin/components/AdminInventoryDetails';
import AdminOrderDetails from './components/features/admin/components/AdminOrderDetails';
import AdminUserDetails from './components/features/admin/components/AdminUserDetails';
import AuditLogViewer from './components/features/admin/components/AuditLogViewer';
import CommissionManager from './components/features/admin/components/CommissionManager';
import InventoryList from './components/features/admin/components/InventoryList';
import SellerDetails from './components/features/admin/components/SellerDetails';
import SellerOnboardingDetailsModal from './components/features/admin/components/SellerOnboardingDetailsModal';
import SupportRequestManager from './components/features/admin/components/SupportRequestManager';
import SupportTicketBoard from './components/features/admin/components/SupportTicketBoard';
import InventoryLowStock from './components/features/admin/components/InventoryLowStock';
import AdminReturns from './components/features/admin/components/AdminReturns';
import AdminAbandonedCarts from './components/features/admin/components/AdminAbandonedCarts';
import CouponManager from './components/features/admin/components/CouponManager';
import RewardCoinManager from './components/features/admin/components/RewardCoinManager';
import AdminRefundLedger from './components/features/admin/components/AdminRefundLedger';



import AdminDashboard from './components/features/admin/pages/AdminDashboard';
import AdminAnalytics from './components/features/admin/pages/AdminAnalytics';
import SiteSettings from './components/features/admin/pages/SiteSettings';

import adminService from './components/features/admin/services/admin.service';
import adminAnalyticsService from './components/features/admin/services/adminAnalytics.service';
import siteSettingsCMSService from './components/features/admin/services/siteSettingsCMS.service';
import AdminLogistics from './components/features/admin/pages/AdminLogistics';

import SellerDashboard from './components/features/seller/pages/SellerDashboard';
import AnalyticsDashboard from './components/features/seller/pages/AnalyticsDashboard';
import SellerRegister from './components/features/seller/pages/SellerRegister';
import SellerAnalytics from './components/features/seller/components/SellerAnalytics';
import SellerProductAnalytics from './components/features/seller/components/SellerProductAnalytics';
import SellerProducts from './components/features/seller/components/SellerProducts';
import SellerOrderDetails from './components/features/seller/components/SellerOrderDetails';
import SellerAgreement from './components/features/seller/components/SellerAgreement';
import analyticsService from './components/features/seller/services/analytics.service';
import SellerStoreSettings from './components/features/seller/components/SellerStoreSettings';
import SellerLogistics from './components/features/seller/pages/SellerLogistics';
import SellerProfile from './components/features/seller/pages/SellerProfile';
import SellerWarehouse from './components/features/seller/pages/SellerWarehouse';
import SellerPasswordSettings from './components/features/seller/components/SellerPasswordSettings';

import Checkout from './components/features/order/Checkout';
import OrderConfirmation from './components/features/order/OrderConfirmation';
import DigitalCheckout from './components/features/order/DigitalCheckout';
import PhysicalCheckout from './components/features/order/PhysicalCheckout';
import OrderDetail from './components/features/order/OrderDetail';
import OrderProcessing from './components/features/order/OrderProcessing';
import OrderReview from './components/features/order/OrderReview';
import OrderInitiating from './components/features/order/OrderInitiating';
import PaymentSuccess from './components/features/order/PaymentSuccess';
import PaymentFailure from './components/features/order/PaymentFailure';
import TrackOrder from './components/features/order/TrackOrder';

import orderService from './components/features/order/services/order.service';

import ProductCard from './components/products/components/ProductCard';
import ProductRecommendations from './components/products/components/ProductRecommendations';
import AddProduct from './components/products/components/AddProduct';
import ProductDetail from './components/products/components/ProductDetail';
import Products from './components/products/components/Products';
import BooksPage from './components/products/category/BooksPage';
import CategorySelect from './components/products/category/CategorySelect';
import NotebooksPage from './components/products/category/NotebooksPage';
import StationeryPage from './components/products/category/StationeryPage';

import CategoryPage from './components/products/category/CategoryPage';
import CategoryTree from './components/category/CategoryTree';

import productService from './components/products/services/product.service';

import Index from './components/home/Index';
import CategorySection from './components/home/CategorySection';
import FeaturedProducts from './components/home/FeaturedProducts';
import HeroSection from './components/home/HeroSection';
import PromoBanner from './components/home/PromoBanner';

import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Layout from './components/layout/Layout';

// import PreferenceDisplay from './components/preferences/preferenceDisplay';
// import PreferenceOnboarding from './components/preferences/PreferenceOnboarding';

import WishlistIcon from './components/wishlist/WishlistIcon';
import WishlistPage from './components/wishlist/WishlistPage';
import WishlistItem from './components/wishlist/WishlistItem';

import { generateInvoice } from './lib/invoiceGenerator';
import pdfjsLib from './lib/pdfjs';

import Cart from './components/features/custoumer/components/Cart';
import CustomerDashboard from './components/features/custoumer/CustomerDashboard';
import MyEbooks from './components/features/custoumer/components/MyEbooks';
import MyRefunds from './components/features/custoumer/components/MyRefunds';
import Profile from './components/features/custoumer/components/Profile';
import ReadEbook from './components/features/custoumer/components/ReadEbook';
import WalletPage from './components/features/custoumer/pages/WalletPage';

import ReviewSection from './components/reviews/ReviewSection';



export {
    ChatBot,
    UserTable, SellerTable, ReviewModeration, OrderTable, AdminAccountSettings, AdminInventoryDetails,
    AdminOrderDetails, AdminUserDetails, AuditLogViewer, CommissionManager, InventoryList, AdminOrderLedger, AdminSellerPayoutLedger,
    SellerDetails, SellerOnboardingDetailsModal, SupportRequestManager, SupportTicketBoard, CouponManager, RewardCoinManager,


    AdminDashboard, AdminAnalytics, SiteSettings, InventoryLowStock, AdminLogistics, AdminReturns, AdminAbandonedCarts, AdminRefundLedger,
    adminService, adminAnalyticsService, siteSettingsCMSService,

    Cart, CustomerDashboard, MyEbooks, MyRefunds, Profile, ReadEbook, WalletPage,

    SellerAnalytics, SellerProductAnalytics, SellerProducts, SellerOrderDetails,
    SellerDashboard, AnalyticsDashboard, SellerRegister, SellerAgreement, SellerStoreSettings, SellerLogistics, SellerProfile, SellerWarehouse, SellerPasswordSettings,
    analyticsService,

    Checkout, DigitalCheckout, OrderConfirmation, OrderDetail, OrderProcessing, OrderReview, OrderInitiating, PaymentSuccess, PaymentFailure, PhysicalCheckout, TrackOrder,

    orderService,

    ProductCard, ProductRecommendations, ProductDetail, Products, AddProduct, BooksPage, NotebooksPage, StationeryPage, CategoryPage, CategoryTree, CategorySelect,
    productService,

    Index,
    FeaturedProducts, HeroSection, PromoBanner, CategorySection,
    Header, Footer, Layout,
    // PreferenceDisplay,
    generateInvoice, pdfjsLib,

    WishlistIcon, WishlistPage, WishlistItem, ReviewSection,

    // Common Pages & Auth
    AboutUs, Addresses, Blog, Careers, ContactUs, ForgotPassword, HelpCenter, Login, NotFound, OAuthSuccess, Press, PrivacyPolicy, RefundPolicy, ShippingPolicy, SetPassword, Settings, TermsOfService
};