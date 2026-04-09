const response = require('../../utils/response');

/**
 * Handle incoming user messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleMessage = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return response.error(res, "Message is required", 400);
        }

        // 1. Normalization
        const normalizedMessage = message.toLowerCase().trim().replace(/[^\w\s]/gi, '');

        // 2. Intent Detection Logic
        let intentResult = detectIntent(normalizedMessage);

        // 3. Fallback Enhancement
        if (intentResult.intent === 'UNKNOWN') {
            intentResult = {
                intent: 'UNKNOWN',
                message: "I'm not fully sure what you need yet. Are you asking about payments, ebooks, or looking for a product?",
                actions: [
                    { label: "Help with E-books", url: "/library" },
                    { label: "Payment Issues", url: "/support" },
                    { label: "Browse Products", url: "/products" }
                ],
                confidence: 0.0
            };
        }

        // 4. Send Response
        return response.success(res, "Message processed", intentResult);

    } catch (error) {
        console.error("Chatbot Error:", error);
        return response.error(res, "Internal Server Error", 500);
    }
};

/**
 * Deterministic Intent Detection System
 */
const detectIntent = (text) => {
    const INTENTS = [
        {
            id: 'REFUND_ISSUE',
            patterns: [
                'refund', 'money back', 'reimburse', 'return money', 'wallet', 'balance',
                'charged twice', 'double charge', 'deducted', 'payment reversed', 'fail transaction',
                'my money', 'lost money', 'where is my money', 'payment failed'
            ],
            response: {
                message: "I understand you have a payment or refund issue. Our support team can check your transaction details immediately.",
                actions: [
                    { label: "Contact Support", url: "/support" },
                    { label: "View Orders", url: "/orders" }
                ]
            }
        },
        {
            id: 'EBOOK_ACCESS',
            patterns: [
                'ebook', 'e-book', 'pdf', 'epub', 'digital book', 'download', 'file',
                'read online', 'access book', 'open book', 'library', 'kindle'
            ],
            response: {
                message: "You can access all your purchased e-books and PDFs in your personal library.",
                actions: [
                    { label: "Go to My Library", url: "/library" },
                    { label: "How to Download", url: "/help/ebooks" }
                ]
            }
        },
        {
            id: 'ORDER_TRACKING',
            patterns: [
                'track', 'where is my order', 'shipping', 'delivery', 'arriving', 'status',
                'package', 'shipment', 'courier', 'late', 'delayed', 'not received'
            ],
            response: {
                message: "You can track your active orders and see their live status in your Order History.",
                actions: [
                    { label: "Track My Order", url: "/orders" }
                ]
            }
        },
        {
            id: 'PRODUCT_SEARCH',
            patterns: [
                'search', 'find', 'looking for', 'buy', 'purchase', 'shop', 'store',
                'catalog', 'item', 'product', 'available', 'stock', 'price', 'cost'
            ],
            response: {
                message: "Looking for something specific? You can browse our full collection or use the search bar.",
                actions: [
                    { label: "Browse Products", url: "/products" },
                    { label: "Search Now", url: "/search" }
                ]
            }
        },
        {
            id: 'ACCOUNT_HELP',
            patterns: [
                'login', 'signin', 'password', 'reset', 'forgot', 'account', 'profile',
                'register', 'signup', 'create account', 'email', 'username', 'kyc'
            ],
            response: {
                message: "Need help with your account? You can manage your settings or reset your password here.",
                actions: [
                    { label: "My Profile", url: "/profile" },
                    { label: "Login/Register", url: "/login" }
                ]
            }
        },
        {
            id: 'GENERAL_HELP',
            patterns: [
                'help', 'support', 'assist', 'human', 'agent', 'contact', 'call',
                'stuck', 'error', 'bug', 'issue', 'problem', 'broken', 'question'
            ],
            response: {
                message: "Our support center is available 24/7. You can also raise a ticket for complex issues.",
                actions: [
                    { label: "Help Center", url: "/help" },
                    { label: "Contact Us", url: "/contact" }
                ]
            }
        }
    ];

    // Priority based matching (Order in array dictates priority if multiple match, 
    // but here we can return the first strong match)

    for (const intent of INTENTS) {
        if (intent.patterns.some(pattern => text.includes(pattern))) {
            return {
                intent: intent.id,
                message: intent.response.message,
                actions: intent.response.actions,
                confidence: 1.0 // Hardcoded confidence for exact keyword match
            };
        }
    }

    return { intent: 'UNKNOWN' };
};

module.exports = {
    handleMessage
};
