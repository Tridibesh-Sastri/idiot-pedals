import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers: Provide application-wide state for Authentication, Cart, and Notifications
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';

// Lenis + GSAP ScrollTrigger Synchronizer
import { SmoothScroll } from './components/SmoothScroll';

// Common Global Layout Components
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { CartDrawer } from './components/common/CartDrawer';
import { ToastContainer } from './components/common/ToastContainer';
import { ScrollToTop } from './components/common/ScrollToTop';

// Page Views: Public marketing, product showcase, and support
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';

// Page Views: User authentication and two-step verification
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { VerifyPhonePage } from './pages/VerifyPhonePage';

// Page Views: E-commerce checkout, order history, and account profile
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { AccountPage } from './pages/AccountPage';

/**
 * Root Application Component with Lenis Smooth Scrolling and Editorial Dark/Neon UI
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <SmoothScroll>
              {/* Resets window scroll position smoothly when route changes */}
              <ScrollToTop />

              {/* Main Application Shell with obsidian black and neon orange accents */}
              <div className="min-h-screen bg-[#0B0E14] text-[#F6F4EE] selection:bg-[#FF5E1E] selection:text-white flex flex-col font-sans">
                
                {/* Dynamic Global Navbar */}
                <Navbar />

                {/* Main Routing Viewport */}
                <main className="flex-grow">
                  <Routes>
                    {/* Public marketing and catalog routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/product" element={<ProductPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />

                    {/* Authentication & Verification routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/verify-phone" element={<VerifyPhonePage />} />

                    {/* Customer Orders & Checkout routes */}
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/orders/:id" element={<OrderDetailPage />} />
                    <Route path="/account" element={<AccountPage />} />

                    {/* Catch-all fallback: redirect any unknown URL to HomePage */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>

                {/* Global Overlays: Slide-over Cart Drawer & Floating Toast Notifications */}
                <CartDrawer />
                <ToastContainer />

                {/* Global Brand Footer */}
                <Footer />
              </div>
            </SmoothScroll>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
