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
// NOTE (hidden 2026-09-25): Bag/Cart drawer kept in code but never mounted on the website.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CartDrawer as _CartDrawer } from './components/common/CartDrawer';
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
 * Root Application Component with Lenis Smooth Scrolling and Light Editorial UI
 * (white / warm paper + neon orange — absorbed from the landing hero)
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

              {/* Main Application Shell with warm cream and molten orange accents */}
              <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] selection:bg-[#FF5E1E] selection:text-white flex flex-col font-sans">
                
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

                {/* Global Overlays: Floating Toast Notifications */}
                {/* HIDDEN FROM WEBSITE (kept in code): <_CartDrawer /> is never mounted,
                    so the Bag/cart drawer does not load at all. Buy flow goes direct to /checkout. */}
                {/* <_CartDrawer /> */}
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
