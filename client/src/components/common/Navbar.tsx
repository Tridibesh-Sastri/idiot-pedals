import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User as UserIcon, Menu, X, ArrowRight } from 'lucide-react';
// NOTE (hidden 2026-09-25): Bag/cart UI removed from website; cart logic kept in code.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ShoppingBag as _ShoppingBag } from 'lucide-react';
import { IdiotPedalsLogo } from './IdiotPedalsLogo';
import { useAuth } from '../../context/AuthContext';

void _ShoppingBag;

interface NavbarProps {
  forceVisible?: boolean;
  isScrubCompleted?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ forceVisible = false, isScrubCompleted = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Close mobile menu on route change (pathname or hash, e.g. /#controls)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Navbar is always visible — no scroll animation hiding it
  const isVisible = true;

  const navLinks = [
    // HIDDEN FROM WEBSITE (kept in code):
    // { name: 'Product', path: '/product' },
    // { name: 'Tone Demo', path: '/#demo' },
    { name: 'Home', path: '/' },
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
                  className={`px-3.5 lg:px-4 py-2 rounded-full transition-all duration-200 ${
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

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">

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

            {/* HIDDEN FROM WEBSITE (kept in code): Bag / Cart button removed —
                <button onClick={() => setIsCartOpen(true)} ...>
                  <_ShoppingBag size={14} ... />
                  <span>Bag [totalQuantity]</span>
                </button>
            */}

            {/* Primary Buy Action (direct checkout; Product catalog hidden but kept in code: /product) */}
            <Link
              to="/checkout"
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
        <div className="fixed inset-0 z-40 bg-[#0B0E14]/98 backdrop-blur-3xl pt-28 px-6 md:hidden flex flex-col justify-between pb-10 animate-in fade-in duration-200">
          <div className="flex flex-col gap-5">
            <div className="border-b border-white/10 pb-4 mb-2">
              <IdiotPedalsLogo variant="dark" size="md" />
              <p className="text-xs text-[#8E98A8] font-mono-tech tracking-widest uppercase mt-2">
                Handcrafted Analog Guitar Gear —— Burdwan
              </p>
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-editorial tracking-wide text-[#F6F4EE] hover:text-[#FF5E1E] flex items-center justify-between py-2 border-b border-white/5"
              >
                <span>{link.name}</span>
                <ArrowRight size={16} className="text-[#FF5E1E]" />
              </Link>
            ))}

            <Link
              to={isAuthenticated ? '/orders' : '/login'}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-sm font-mono-tech tracking-wider uppercase text-[#8E98A8] hover:text-[#F6F4EE] flex items-center justify-between py-2"
            >
              <span>My Orders & Tracking</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-4">
            <Link
              to="/checkout"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white font-mono-tech font-bold tracking-[0.2em] uppercase text-center rounded-full flex items-center justify-center gap-2 text-xs shadow-xl shadow-[#FF5E1E]/30"
            >
              <span>Order Neon Fuzz Box — ₹2,499</span>
              <ArrowRight size={14} />
            </Link>
            <p className="text-center text-[11px] font-mono-tech text-[#8E98A8]">
              Free Insured Shipping Across India • 1-Year Bench Warranty
            </p>
          </div>
        </div>
      )}
    </>
  );
};
