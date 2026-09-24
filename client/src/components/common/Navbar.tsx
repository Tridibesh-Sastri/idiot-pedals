import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User as UserIcon, Menu, X, ArrowRight } from 'lucide-react';
import { IdiotPedalsLogo } from './IdiotPedalsLogo';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { totalQuantity, setIsCartOpen } = useCart();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { name: 'Neon Fuzz Box', path: '/product' },
    { name: 'Audio Demo', path: '/#demo' },
    { name: 'Workbench Story', path: '/about' },
    { name: 'Support', path: '/contact' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#0B0B0A]/95 backdrop-blur-md border-b border-[#8C857A]/20 py-3 shadow-xl'
            : 'bg-gradient-to-b from-[#0B0B0A]/90 to-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D91E18]">
              <IdiotPedalsLogo variant="dark" size="sm" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-sm font-medium tracking-wide uppercase transition-colors relative py-1 ${
                    location.pathname === link.path
                      ? 'text-[#F3EFE6] font-semibold'
                      : 'text-[#8C857A] hover:text-[#F3EFE6]'
                  }`}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#D91E18]" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 sm:gap-5">
              {/* Account Link */}
              <Link
                to={isAuthenticated ? '/account' : '/login'}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-wider uppercase text-[#8C857A] hover:text-[#F3EFE6] transition-colors rounded-lg border border-[#8C857A]/20 hover:border-[#8C857A]/40"
                aria-label="User Account"
              >
                <UserIcon size={16} className={isAuthenticated ? 'text-[#D91E18]' : ''} />
                <span className="hidden sm:inline">
                  {isAuthenticated ? (user?.name?.split(' ')[0] || 'Account') : 'Login'}
                </span>
              </Link>

              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-[#171513] border border-[#8C857A]/30 text-[#F3EFE6] hover:border-[#D91E18] transition-colors"
                aria-label={`Open Cart (${totalQuantity} items)`}
              >
                <ShoppingBag size={18} />
                {totalQuantity > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-[#D91E18] text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md">
                    {totalQuantity}
                  </span>
                )}
              </button>

              {/* Quick Buy CTA - Desktop */}
              <Link
                to="/product"
                className="hidden lg:inline-flex items-center gap-2 px-4 py-2 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-bold tracking-widest uppercase rounded transition-colors shadow-sm"
              >
                Buy Now
                <ArrowRight size={14} />
              </Link>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-[#F3EFE6] hover:text-[#D91E18] transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-down / Overlay Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#0B0B0A]/95 backdrop-blur-xl pt-24 px-6 md:hidden flex flex-col justify-between pb-10 animate-in fade-in duration-200">
          <div className="flex flex-col gap-6">
            <div className="border-b border-[#8C857A]/20 pb-4 mb-2">
              <IdiotPedalsLogo variant="dark" size="md" />
              <p className="text-xs text-[#8C857A] tracking-widest uppercase mt-2">
                Handcrafted Analog Guitar Gear
              </p>
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-xl font-bold tracking-tight text-[#F3EFE6] hover:text-[#D91E18] flex items-center justify-between py-2 border-b border-[#8C857A]/10"
              >
                {link.name}
                <ArrowRight size={18} className="text-[#8C857A]" />
              </Link>
            ))}

            <Link
              to={isAuthenticated ? '/orders' : '/login'}
              className="text-lg font-medium text-[#8C857A] hover:text-[#F3EFE6] flex items-center justify-between py-2"
            >
              My Orders & Tracking
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            <Link
              to="/checkout"
              className="w-full py-4 bg-[#D91E18] text-white font-bold tracking-widest uppercase text-center rounded flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#D91E18]/20"
            >
              Buy Neon Fuzz Box — ₹2,499
            </Link>
            <p className="text-center text-xs text-[#8C857A]">
              Free Insured Shipping Across India • 1-Year Bench Warranty
            </p>
          </div>
        </div>
      )}
    </>
  );
};
