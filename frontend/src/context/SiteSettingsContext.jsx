import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/config/api';
import {
    BRAND_EMAIL,
    BRAND_LOGO,
    BRAND_NAME,
    BRAND_PHONE,
    BRAND_TAGLINE,
} from '@/config/brand';

const SiteSettingsContext = createContext(null);

const FALLBACK_HERO_BANNERS = [
    {
        id: 1,
        badge: "Trusted Marketplace",
        title: "Sell Smarter with",
        highlight: BRAND_NAME,
        description: "Launch products, manage orders, and give customers a faster, smoother checkout experience from one polished storefront.",
        btnText: "Explore Store",
        btnLink: "/products",
        sideType: "commerce",
        bgImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?fit=crop&w=1600&q=80",
        sideImage: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?fit=crop&w=900&q=80",
    },
    {
        id: 2,
        badge: "Built for Growth",
        title: "Payments, Fulfillment,",
        highlight: "and Control",
        description: "From secure payments to shipping visibility and seller management, every touchpoint is designed to feel modern and reliable.",
        sideType: "features",
        bgImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?fit=crop&w=1200&q=80",
        sideImage: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?fit=crop&w=900&q=80",
    },
    {
        id: 3,
        badge: "Fast Checkout",
        title: "Create Better",
        highlight: "Buying Journeys",
        description: "Give every customer a clean, fast, mobile-friendly shopping flow with clear pricing, dependable support, and strong brand trust.",
        btnText: "Start Shopping",
        btnLink: "/products",
        sideType: "shopping",
        bgImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?fit=crop&w=1200&q=80",
        sideImage: "https://images.unsplash.com/photo-1515169067868-5387ec356754?fit=crop&w=900&q=80",
    },
];

const FALLBACK_PROMO_BANNERS = [
    {
        image: "https://www.smartlook.com/blog/wp-content/uploads/sites/2/2022/03/the-rise-of-free-shipping-8.jpeg",
        title: 'Fast Fulfillment',
        description: 'Reliable dispatch and delivery visibility',
    },
    {
        image: "https://www.freshbooks.com/wp-content/uploads/2022/01/secure-payment.jpg",
        title: 'Secure Payments',
        description: 'Protected checkout with smoother order flow',
    },
];

const FALLBACK_FOOTER_LINKS = {
    company: [
        { name: 'About Us', href: '/about' },
        { name: 'Careers', href: '/careers' },
        { name: 'Press', href: '/press' },
        { name: 'Blog', href: '/blog' },
    ],
    support: [
        { name: 'Help Center', href: '/help' },
        { name: 'Contact Us', href: '/contact' },
        { name: 'Track Order', href: '/track-order' },
    ],
    legal: [
        { name: 'Privacy Policy', href: '/privacyPolicy' },
        { name: 'Terms of Service', href: '/termsOfService' },
        { name: 'Refund Policy', href: '/refundpolicy' },
        { name: 'Shipping Policy', href: '/shippingpolicy' },
        { name: 'Seller Agreement', href: '/seller-agreement' },
    ],
};

const FALLBACKS = {
    site_logo: BRAND_LOGO,
    hero_banners: FALLBACK_HERO_BANNERS,
    promo_banners: FALLBACK_PROMO_BANNERS,
    footer_links: FALLBACK_FOOTER_LINKS,
    contact_email: BRAND_EMAIL,
    contact_phone: BRAND_PHONE,
    header_notices: [
        {
            id: 1,
            message: `Welcome to ${BRAND_NAME}. ${BRAND_TAGLINE}`,
            is_active: true
        }
    ],
    maintenance_mode: { enabled: false, message: 'Platform under maintenance' }
};

export const SiteSettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        ...FALLBACKS,
        loading: true
    });

    const fetchSettings = useCallback(async () => {
        try {
            const res = await api.get('/api/site-settings');
            if (res.data.success) {
                const fetchedData = res.data.data;

                const mergedSettings = {
                    site_logo: fetchedData.site_logo || FALLBACKS.site_logo,
                    contact_email: fetchedData.contact_email || FALLBACKS.contact_email,
                    contact_phone: fetchedData.contact_phone || FALLBACKS.contact_phone,
                    hero_banners: Array.isArray(fetchedData.hero_banners)
                        ? fetchedData.hero_banners
                        : FALLBACKS.hero_banners,
                    promo_banners: Array.isArray(fetchedData.promo_banners)
                        ? fetchedData.promo_banners
                        : FALLBACKS.promo_banners,
                    footer_links: fetchedData.footer_links || FALLBACKS.footer_links,
                    header_notices: Array.isArray(fetchedData.header_notices)
                        ? fetchedData.header_notices
                        : FALLBACKS.header_notices,
                    maintenance_mode: fetchedData.maintenance_mode || FALLBACKS.maintenance_mode
                };

                setSettings({
                    ...mergedSettings,
                    loading: false
                });
            }
        } catch (error) {
            console.error('API Error in SiteSettings:', error);

            if (error.response?.status === 503 && error.response.data?.data) {
                const fetchedData = error.response.data.data;
                setSettings({
                    ...FALLBACKS,
                    header_notices: (Array.isArray(fetchedData.header_notices) && fetchedData.header_notices.length > 0)
                        ? fetchedData.header_notices
                        : FALLBACKS.header_notices,
                    maintenance_mode: fetchedData.maintenance_mode || { enabled: true },
                    loading: false
                });
            } else {
                setSettings(prev => ({ ...prev, loading: false }));
            }
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return (
        <SiteSettingsContext.Provider value={{ ...settings, fetchSettings }}>
            {children}
        </SiteSettingsContext.Provider>
    );
};

export const useSiteSettings = () => {
    const context = useContext(SiteSettingsContext);
    if (!context) {
        throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
    }
    return context;
};

export default SiteSettingsContext;
