import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User as UserIcon, Menu, X, ArrowRight, ShoppingBag } from 'lucide-react';
import { IdiotPedalsLogo } from './IdiotPedalsLogo';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

interface NavbarProps {
  forceVisible?: boolean;
  isScrubCompleted?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ forceVisible = false, isScrubCompleted = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { totalQuantity, setIsCartOpen } = useCart();
  const location = useLocation();

  // Close mobile menu on route change (pathname or hash, e.g. /#controls)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Lock body scroll and listen for Escape when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMobileMenuOpen]);

  // Navbar is always visible — no scroll animation hiding it
  const isVisible = true;

  const navLinks = [
    // HIDDEN FROM WEBSITE (kept in code):
    // { name: 'Tone Demo', path: '/#demo' },
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/products' },
    { name: 'Controls', path: '/#controls' },
    { name: 'Specs', path: '/#specs' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const isLinkActive = (path: string) => {
    if (path.includes('#')) {
      return `${location.pathname}${location.hash}` === path;
    }
    if (path === '/') {
      return location.pathname === '/' && !location.hash;
    }
    if (path === '/products') {
      return location.pathname === '/products' || location.pathname.startsWith('/products/');
    }
    return location.pathname === path;
  };

  return (
    <>
      <header
        className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-6xl transition-all duration-700 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-[#121722]/85 hover:bg-[#121722]/95 backdrop-blur-2xl border border-white/10 rounded-full px-5 sm:px-8 py-3 sm:py-3.5 shadow-2xl flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 group focus:outline-none shrink-0"
            aria-label="IDIOT Pedals Home"
          >
            <IdiotPedalsLogo variant="dark" size="sm" />
          </Link>

          {/* Desktop Nav Links — balanced 5-link editorial row with active orange pill */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-mono-tech tracking-[0.18em] uppercase">
            {navLinks.map((link) => {
              const isActive = isLinkActive(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-2.5 lg:px-4 py-2 rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-[#FF5E1E]/15 text-[#FF5E1E] font-bold ring-1 ring-[#FF5E1E]/40'
                      : 'text-[#F6F4EE]/80 hover:text-[#FF5E1E] hover:bg-white/5'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls — gaps kept tight so logo + links + actions fit with the cart icon */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Meta Location Tag */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-mono-tech text-[#8E98A8] tracking-widest uppercase border-r border-white/10 pr-3">
              <span>India</span>
              <span className="text-[#FF5E1E]">——</span>
              <span className="text-[#F6F4EE]">INR ₹</span>
            </div>

            {/* User Account */}
            <Link
              to={isAuthenticated ? '/account' : '/login'}
              className="hidden sm:flex items-center gap-2 text-xs font-mono-tech tracking-wider uppercase text-[#8E98A8] hover:text-[#F6F4EE] px-2.5 py-1.5 rounded-full hover:bg-white/5 transition-colors"
              aria-label="User Account"
            >
              <UserIcon size={14} className={isAuthenticated ? 'text-[#FF5E1E]' : ''} />
              <span className="text-[11px]">
                {isAuthenticated ? (user?.name?.split(' ')[0] || 'Account') : 'Sign In'}
              </span>
            </Link>

            {/* Bag / Cart */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-1.5 text-xs font-mono-tech tracking-wider uppercase text-[#8E98A8] hover:text-[#F6F4EE] px-2 py-1.5 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Open cart"
            >
              <span className="relative">
                <ShoppingBag size={14} />
                {totalQuantity > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#FF5E1E] text-white text-[10px] font-bold flex items-center justify-center">
                    {totalQuantity}
                  </span>
                )}
              </span>
              <span className="text-[11px] hidden lg:inline">Bag</span>
            </button>

            {/* Primary Buy Action (routes to the server-driven catalogue) */}
            <Link
              to="/products"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold tracking-[0.2em] uppercase shadow-lg shadow-[#FF5E1E]/25 transition-all glow-neon-subtle"
            >
              <span>Buy Now</span>
              <ArrowRight size={12} />
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-[#F6F4EE] hover:text-[#FF5E1E] transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B0E14] md:hidden h-[100dvh] overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          <div className="min-h-full flex flex-col justify-between pt-24 sm:pt-28 px-6 pb-8 max-w-md mx-auto w-full">
            <div className="flex flex-col gap-4">
              <div className="border-b border-white/10 pb-3 mb-1">
                <IdiotPedalsLogo variant="dark" size="md" />
                <p className="text-[11px] text-[#8E98A8] font-mono-tech tracking-widest uppercase mt-1.5">
                  Handcrafted Analog Guitar Gear —— Burdwan
                </p>
              </div>

              {/* Primary account action — prominent so logged-out users find sign-in immediately */}
              <Link
                to={isAuthenticated ? '/account' : '/login'}
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white font-mono-tech font-bold tracking-[0.2em] uppercase text-center rounded-full flex items-center justify-center gap-2 text-xs shadow-lg shadow-[#FF5E1E]/25 transition-transform active:scale-[0.98]"
              >
                <UserIcon size={14} />
                <span>{isAuthenticated ? (user?.name?.split(' ')[0] || 'My Account') : 'Sign In'}</span>
              </Link>

              {navLinks.map((link) => {
                const active = isLinkActive(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-xl font-editorial tracking-wide flex items-center justify-between py-2 border-b border-white/5 transition-colors ${
                      active ? 'text-[#FF5E1E]' : 'text-[#F6F4EE] hover:text-[#FF5E1E]'
                    }`}
                  >
                    <span>{link.name}</span>
                    <ArrowRight size={15} className={active ? 'text-[#FF5E1E]' : 'text-[#8E98A8]'} />
                  </Link>
                );
              })}

              <Link
                to={isAuthenticated ? '/orders' : '/login'}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-xs font-mono-tech tracking-wider uppercase text-[#8E98A8] hover:text-[#F6F4EE] flex items-center justify-between py-2"
              >
                <span>My Orders & Tracking</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="pt-6 pb-2 space-y-3 mt-auto">
              <Link
                to="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-3.5 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white font-mono-tech font-bold tracking-[0.2em] uppercase text-center rounded-full flex items-center justify-center gap-2 text-xs shadow-xl shadow-[#FF5E1E]/30 transition-transform active:scale-[0.98]"
              >
                <span>Shop Pedals</span>
                <ArrowRight size={14} />
              </Link>
              <p className="text-center text-[10px] font-mono-tech text-[#8E98A8]">
                Free Insured Shipping Across India • 1-Year Bench Warranty
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
