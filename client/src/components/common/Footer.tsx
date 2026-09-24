import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ShieldCheck, Truck, Wrench, Heart } from 'lucide-react';
import { IdiotPedalsLogo } from './IdiotPedalsLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B0B0A] border-t border-[#8C857A]/25 pt-16 pb-12 text-[#8C857A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Trust Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-2xl bg-[#171513] border border-[#8C857A]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18] shrink-0">
              <Wrench size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F3EFE6] uppercase tracking-wider">
                Direct From Workbench
              </div>
              <div className="text-[11px] text-[#8C857A]">No distributor markup or inflated retail pricing.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18] shrink-0">
              <Truck size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F3EFE6] uppercase tracking-wider">
                Free Nationwide Shipping
              </div>
              <div className="text-[11px] text-[#8C857A]">Insured express delivery via Blue Dart Express.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B0B0A] border border-[#8C857A]/30 flex items-center justify-center text-[#D91E18] shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-[#F3EFE6] uppercase tracking-wider">
                1-Year Bench Warranty
              </div>
              <div className="text-[11px] text-[#8C857A]">Comprehensive repair & technical player support.</div>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <IdiotPedalsLogo variant="dark" size="md" />
            <div className="text-xs font-mono-tech tracking-widest text-[#D91E18] font-bold uppercase">
              CHEAPER. CLASSIC SOUND.
            </div>
            <p className="text-xs sm:text-sm text-[#8C857A] max-w-sm leading-relaxed">
              We make raw, high-character analog guitar pedals for real working players. Built with through-hole components, rugged aluminum chassis, and genuine passion for live rock tone.
            </p>
            <div className="text-xs text-[#8C857A] space-y-1 pt-2">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#D91E18]" />
                <span>Kolkata Workshop, West Bengal, India</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#D91E18]" />
                <span>workbench@idiotpedals.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#D91E18]" />
                <span>+91 98301 23456 (Mon - Sat, 10 AM - 7 PM IST)</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#F3EFE6]">
              Gear
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/product" className="hover:text-[#F3EFE6] transition-colors">
                  Neon Fuzz Box
                </Link>
              </li>
              <li>
                <Link to="/#demo" className="hover:text-[#F3EFE6] transition-colors">
                  Audio Test Bench
                </Link>
              </li>
              <li>
                <Link to="/product#specs" className="hover:text-[#F3EFE6] transition-colors">
                  Technical Specifications
                </Link>
              </li>
              <li>
                <Link to="/product#gallery" className="hover:text-[#F3EFE6] transition-colors">
                  Hardware Gallery
                </Link>
              </li>
            </ul>
          </div>

          {/* Workshop Story & Support */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#F3EFE6]">
              Workshop
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-[#F3EFE6] transition-colors">
                  Our Philosophy
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#F3EFE6] transition-colors">
                  Workbench Support
                </Link>
              </li>
              <li>
                <Link to="/contact#warranty" className="hover:text-[#F3EFE6] transition-colors">
                  Warranty & Repairs
                </Link>
              </li>
              <li>
                <Link to="/about#circuit" className="hover:text-[#F3EFE6] transition-colors">
                  Analog Manifesto
                </Link>
              </li>
            </ul>
          </div>

          {/* Orders & Account */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono-tech font-bold uppercase tracking-wider text-[#F3EFE6]">
              Customer Care
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/orders" className="hover:text-[#F3EFE6] transition-colors">
                  Track Existing Order
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-[#F3EFE6] transition-colors">
                  Player Account
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-[#F3EFE6] transition-colors">
                  Direct Checkout
                </Link>
              </li>
              <li>
                <span className="text-[11px] text-[#8C857A] block pt-2">
                  Ships via Shiprocket & Blue Dart Express nationwide.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#8C857A]/15 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C857A] gap-4">
          <div>
            © {new Date().getFullYear()} IDIOT Pedals. All rights reserved. Handcrafted for real guitar players.
          </div>
          <div className="flex items-center gap-6">
            <span>Play Different.</span>
            <span>Zero Pretension.</span>
            <span className="text-[#D91E18] font-bold">₹2,499 Flat</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
