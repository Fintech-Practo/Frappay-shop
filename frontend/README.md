 # Frontend File Structure
       src--|
            +---app
            |       App.jsx
            |       AppProviders.jsx
            |       AppRoutes.jsx
            |       ScrollToTopOnNavigation.jsx
            |
            +---assets
            |       Logo.png
            |
            +---components
            |   |   BookCard.jsx
            |   |   NavLink.jsx
            |   |   ProtectedRoute.jsx
            |   |
            |   +---chatbot
            |   |       ChatBot.jsx
            |   |
            |   +---common_pages
            |   |       AboutUs.jsx
            |   |       Addresses.jsx
            |   |       Blog.jsx
            |   |       Careers.jsx
            |   |       CategorySelect.jsx
            |   |       ContactUs.jsx
            |   |       ForgotPassword.jsx
            |   |       HelpCenter.jsx
            |   |       Login.jsx
            |   |       NotFound.jsx
            |   |       OAuthSuccess.jsx
            |   |       Press.jsx
            |   |       PrivacyPolicy.jsx
            |   |       RefundPolicy.jsx
            |   |       Returns.jsx
            |   |       SetPassword.jsx
            |   |       Settings.jsx
            |   |       TermsOfService.jsx
            |   |
            |   +---features
            |   |   +---admin
            |   |   |   +---components
            |   |   |   |       AdminAccountSettings.jsx
            |   |   |   |       AdminInventoryDetails.jsx
            |   |   |   |       AdminOrderDetails.jsx
            |   |   |   |       AdminSettings.jsx
            |   |   |   |       AdminUserDetails.jsx
            |   |   |   |       AuditLogViewer.jsx
            |   |   |   |       CommissionManager.jsx
            |   |   |   |       InventoryList.jsx
            |   |   |   |       InventoryLowStock.jsx
            |   |   |   |       OrderTable.jsx
            |   |   |   |       ReviewModeration.jsx
            |   |   |   |       SellerDetails.jsx
            |   |   |   |       SellerOnboardingDetailsModal.jsx
            |   |   |   |       SellerTable.jsx
            |   |   |   |       SupportRequestManager.jsx
            |   |   |   |       SupportTicketBoard.jsx
            |   |   |   |       UserTable.jsx
            |   |   |   |
            |   |   |   +---pages
            |   |   |   |       AdminAnalytics.jsx
            |   |   |   |       AdminDashboard.jsx
            |   |   |   |       SiteSettings.jsx
            |   |   |   |
            |   |   |   \---services
            |   |   |           admin.service.js
            |   |   |           adminAnalytics.service.js
            |   |   |           siteSettingsCMS.service.js
            |   |   |
            |   |   +---custoumer
            |   |   |   |   CustomerDashboard.jsx
            |   |   |   |
            |   |   |   \---components
            |   |   |           Cart.jsx
            |   |   |           MyEbooks.jsx
            |   |   |           Profile.jsx
            |   |   |           ReadEbook.jsx
            |   |   |
            |   |   +---order
            |   |   |   |   Checkout.jsx
            |   |   |   |   DigitalCheckout.jsx
            |   |   |   |   OrderConfirmation.jsx
            |   |   |   |   OrderDetail.jsx
            |   |   |   |   OrderProcessing.jsx
            |   |   |   |   OrderReview.jsx
            |   |   |   |   PhysicalCheckout.jsx
            |   |   |   |   TrackOrder.jsx
            |   |   |   |
            |   |   |   \---services
            |   |   |           order.service.js
            |   |   |
            |   |   \---seller
            |   |       +---components
            |   |       |       SellerAgreement.jsx
            |   |       |       SellerAnalytics.jsx
            |   |       |       SellerOrderDetails.jsx
            |   |       |       SellerProductAnalytics.jsx
            |   |       |       SellerProducts.jsx
            |   |       |
            |   |       +---pages
            |   |       |       AnalyticsDashboard.jsx
            |   |       |       SellerDashboard.jsx
            |   |       |       SellerRegister.jsx
            |   |       |
            |   |       \---services
            |   |               analytics.service.js
            |   |
            |   +---home
            |   |       CategorySection.jsx
            |   |       FeaturedProducts.jsx
            |   |       HeroSection.jsx
            |   |       Index.jsx
            |   |       PromoBanner.jsx
            |   |
            |   +---layout
            |   |       Footer.jsx
            |   |       Header.jsx
            |   |       Layout.jsx
            |   |
            |   +---preferences
            |   |       PreferenceDisplay.jsx
            |   |       PreferenceOnboarding.jsx
            |   |
            |   +---products
            |   |   +---category
            |   |   |       BooksPage.jsx
            |   |   |       CategorySelect.jsx
            |   |   |       NotebooksPage.jsx
            |   |   |       StationeryPage.jsx
            |   |   |
            |   |   +---components
            |   |   |       AddProduct.jsx
            |   |   |       ProductCard.jsx
            |   |   |       ProductDetail.jsx
            |   |   |       ProductRecommendations.jsx
            |   |   |       Products.jsx
            |   |   |
            |   |   \---services
            |   |           product.service.js
            |   |
            |   +---reviews
            |   |       ReviewSection.jsx
            |   |
            |   +---ui
            |   |       accordion.jsx
            |   |       alert-dialog.jsx
            |   |       alert.jsx
            |   |       aspect-ratio.jsx
            |   |       avatar.jsx
            |   |       badge.jsx
            |   |       breadcrumb.jsx
            |   |       button.jsx
            |   |       calendar.jsx
            |   |       card.jsx
            |   |       carousel.jsx
            |   |       chart.jsx
            |   |       checkbox.jsx
            |   |       collapsible.jsx
            |   |       command.jsx
            |   |       context-menu.jsx
            |   |       dialog.jsx
            |   |       drawer.jsx
            |   |       dropdown-menu.jsx
            |   |       form.jsx
            |   |       hover-card.jsx
            |   |       input-otp.jsx
            |   |       input.jsx
            |   |       label.jsx
            |   |       menubar.jsx
            |   |       navigation-menu.jsx
            |   |       pagination.jsx
            |   |       popover.jsx
            |   |       progress.jsx
            |   |       radio-group.jsx
            |   |       resizable.jsx
            |   |       scroll-area.jsx
            |   |       select.jsx
            |   |       separator.jsx
            |   |       sheet.jsx
            |   |       sidebar.jsx
            |   |       skeleton.jsx
            |   |       slider.jsx
            |   |       sonner.jsx
            |   |       switch.jsx
            |   |       table.jsx
            |   |       tabs.jsx
            |   |       textarea.jsx
            |   |       toast.jsx
            |   |       toaster.jsx
            |   |       toggle-group.jsx
            |   |       toggle.jsx
            |   |       tooltip.jsx
            |   |       use-toast.js
            |   |
            |   \---wishlist
            |           WishlistIcon.jsx
            |           WishlistItem.jsx
            |           WishlistPage.jsx
            |
            +---config
            |       api.js
            |
            +---context
            |       AuthContext.jsx
            |       CartContext.jsx
            |       PreferenceContext.jsx
            |       ProductContext.jsx
            |       ReviewContext.jsx
            |       SiteSettingsContext.jsx
            |       WishlistContext.jsx
            |
            +---hooks
            |       use-mobile.jsx
            |       use-toast.js
            |
            \---lib
            |       invoiceGenerator.js
            |       pdfjs.js
            |       utils.js
            |   App.css
            |   index.css
            |   index.js
            |   main.jsx
            |   vite-env.d.js
    