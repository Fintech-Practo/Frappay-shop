import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/config/api';
import logo from '@/assets/Logo.png';

const SiteSettingsContext = createContext(null);

const FALLBACK_HERO_BANNERS = [
    {
        id: 1,
        badge: "New Arrivals",
        title: "Discover Your Next",
        highlight: "Great Read",
        description: "Explore thousands of e-books and novels available instantly. Your perfect reading experience starts here.",
        btnText: "Explore E-Books",
        btnLink: "/products?category=ebooks",
        sideType: "ebooks",
        bgImage: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?fit=crop&w=1600&q=80",
        sideImage: "https://cdn8.openculture.com/wp-content/uploads/2016/10/04230142/eBook-List.jpg",
    },
    {
        id: 2,
        badge: "Our Features",
        title: "Why Shop With",
        highlight: "Us?",
        description: "Free shipping, secure payments, fast delivery, and premium quality products. Experience hassle-free shopping like never before.",
        sideType: "features",
        bgImage: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?fit=crop&w=600&q=80",
        sideImage: "https://i.pinimg.com/736x/27/4d/09/274d098d1c56c61e5c5f001b420efe80.jpg",
    },
    {
        id: 3,
        badge: "Shop Now",
        title: "Upgrade Your",
        highlight: "Learning Journey",
        description: "From textbooks to stationery, get everything you need for study or work at unbeatable prices.",
        btnText: "Go to Shopping",
        btnLink: "/products",
        sideType: "shopping",
        bgImage: "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?fit=crop&w=600&q=80",
        sideImage: "https://media.istockphoto.com/id/1357627947/photo/close-up-woman-hand-add-product-to-card-at-shopping-online-mobile-app-on-wood-table-at-home.jpg?s=612x612&w=0&k=20&c=0bX76EH0H4BJGgxjdDyBZ7rljEBJ9VIA5JvzX5yn7O0=",
    },
];

const FALLBACK_PROMO_BANNERS = [
    {
        image: "https://www.smartlook.com/blog/wp-content/uploads/sites/2/2022/03/the-rise-of-free-shipping-8.jpeg",
        title: 'Free Shipping',
        description: 'On orders above ₹499',
    },
    {
        image: "https://www.freshbooks.com/wp-content/uploads/2022/01/secure-payment.jpg",
        title: 'Secure Payments',
        description: '100% secure checkout',
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
        { name: 'Track Order', href: '/track-order'},
    ],
    legal: [
        { name: 'Privacy Policy', href: '/privacyPolicy' },
        { name: 'Terms of Service', href: '/termsOfService' },
        { name: 'Refund Policy', href: '/refundpolicy'},
        { name: 'Shipping Policy', href: '/shippingpolicy' },
        { name: 'Seller Agreement', href: '/seller-agreement'}]
};

const FALLBACKS = {
    site_logo: logo,
    hero_banners: FALLBACK_HERO_BANNERS,
    promo_banners: FALLBACK_PROMO_BANNERS,
    footer_links: FALLBACK_FOOTER_LINKS,
    contact_email: 'support@booksandcopy.com',
    contact_phone: '+91 8062180677',
    header_notices: [
        {
            id: 1,
            message: "Welcome to FrayPay! Enjoy seamless shopping and exclusive deals.",
            is_active: true
        }
    ],
    maintenance_mode: { enabled: false, message: 'Platform under maintenance' }
};

export const SiteSettingsProvider = ({ children }) => {
    // Initial state IS the fallback state to prevent flicker
    const [settings, setSettings] = useState({
        ...FALLBACKS,
        loading: true
    });

    const fetchSettings = useCallback(async () => {
        try {
            const res = await api.get('/api/site-settings');
            if (res.data.success) {
                const fetchedData = res.data.data;

                // Merge logic: Backend overrides ONLY if it exists and has content (for arrays/objects)
                const mergedSettings = {
                    site_logo: fetchedData.site_logo || FALLBACKS.site_logo,
                    contact_email: fetchedData.contact_email || FALLBACKS.contact_email,
                    contact_phone: fetchedData.contact_phone || FALLBACKS.contact_phone,

                    // For arrays, we accept any array from backend
                    hero_banners: Array.isArray(fetchedData.hero_banners)
                        ? fetchedData.hero_banners
                        : FALLBACKS.hero_banners,

                    promo_banners: Array.isArray(fetchedData.promo_banners)
                        ? fetchedData.promo_banners
                        : FALLBACKS.promo_banners,

                    // For objects, check if it exists
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

            // If it's a 503, we might still have data in error.response.data
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
