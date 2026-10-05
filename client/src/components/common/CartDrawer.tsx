import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { IdiotPedalsLogo } from './IdiotPedalsLogo';

export const CartDrawer: React.FC = () => {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeItem, subtotal, total } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-[#FFF8F1] border-l border-[#F0D3B8] flex flex-col shadow-2xl text-[#2A1A12]">

          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[#F0D3B8] flex items-center justify-between bg-white">
            <div>
              <h2 className="text-base font-mono-tech font-bold tracking-wider uppercase flex items-center gap-2 text-[#2A1A12]">
                <span>Workbench Cart</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#FF5E1E]/20 text-[#FF5E1E] border border-[#FF5E1E]/30">
                  {items.length}
                </span>
              </h2>
              <p className="text-xs font-mono-tech text-[#8A6A54] tracking-widest uppercase mt-0.5">
                Direct From Burdwan Lab
              </p>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-[#8A6A54] hover:text-[#FF5E1E] transition-colors rounded-full hover:bg-[#FFF1E6] cursor-pointer"
              aria-label="Close cart"
            >
              <X size={18} />
            </button>
          </div>

          {/* Cart Contents */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-20 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFF1E6] border border-[#F0D3B8] flex items-center justify-center text-[#8A6A54]">
                  <IdiotPedalsLogo variant="light" size="sm" />
                </div>
                <h3 className="text-lg font-editorial font-bold text-[#2A1A12]">Your cart is empty</h3>
                <p className="text-xs text-[#8A6A54] max-w-xs mx-auto leading-relaxed">
                  Add the Neon Fuzz Box to your workbench and hear true analog harmonic character.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold tracking-[0.2em] uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25 transition-all glow-neon-subtle cursor-pointer"
                >
                  Buy Neon Fuzz Box
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-5 bg-white border border-[#F0D3B8] rounded-2xl space-y-4 shadow-md"
                >
                  <div className="flex gap-4">
                    {/* Visual pedal badge preview */}
                    <div className="w-20 h-24 bg-[#FFF1E6] rounded-xl p-2.5 flex flex-col items-center justify-between text-[#2A1A12] shadow-inner border border-[#F0D3B8] shrink-0 relative overflow-hidden">
                      <div className="w-full flex justify-around">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5E1E] shadow-[0_0_4px_#FF5E1E]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF7A00]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF5E1E]"></div>
                      </div>
                      <div className="text-center my-auto">
                        <div className="text-[10px] font-mono-tech font-black tracking-tight leading-none text-[#2A1A12]">IDIOT</div>
                        <div className="text-[8px] font-bold text-[#FF5E1E] italic leading-none font-script">Pedals</div>
                      </div>
                      <div className="w-4 h-4 rounded-full bg-zinc-600 border border-zinc-400 shadow-inner"></div>
                      <div className="absolute bottom-2 left-1.5 w-1.5 h-1.5 rounded-full bg-[#FF5E1E] shadow-[0_0_6px_#FF5E1E]"></div>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="font-mono-tech font-bold text-sm text-[#2A1A12] uppercase tracking-wide">
                            {item.name}
                          </h4>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-[#8A6A54] hover:text-[#FF5E1E] text-xs transition-colors p-1 cursor-pointer"
                            title="Remove from cart"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-[#8A6A54] line-clamp-1 mt-0.5">{item.subtitle}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-[#F0D3B8] rounded-full bg-[#FFF1E6] px-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 text-[#8A6A54] hover:text-[#FF5E1E] transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2.5 text-xs font-mono-tech font-bold text-[#2A1A12]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 text-[#8A6A54] hover:text-[#FF5E1E] transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="text-sm font-mono-tech font-bold text-[#2A1A12]">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </span>
                          {item.originalPrice && (
                            <div className="text-[10px] text-[#8A6A54] line-through font-mono-tech">
                              ₹{(item.originalPrice * item.quantity).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Value Props */}
            {items.length > 0 && (
              <div className="p-4 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl text-xs font-mono-tech space-y-2 text-[#8A6A54]">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-[#FF5E1E]" />
                  <span>Free insured dispatch via Shiprocket</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#FF5E1E]" />
                  <span>1-Year comprehensive workshop warranty</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer / Summary */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-[#F0D3B8] bg-white space-y-4">
              <div className="space-y-1.5 text-xs font-mono-tech">
                <div className="flex justify-between text-[#8A6A54]">
                  <span>Subtotal</span>
                  <span className="text-[#2A1A12] font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#8A6A54]">
                  <span>Express Shipping</span>
                  <span className="text-emerald-600 font-semibold uppercase text-[11px]">Free</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#F0D3B8] text-[#2A1A12]">
                  <span>Total Amount</span>
                  <span className="text-base font-black text-[#2A1A12]">₹{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleCheckout}
                  className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white font-mono-tech font-bold tracking-[0.2em] uppercase rounded-full flex items-center justify-center gap-2 text-xs shadow-xl shadow-[#FF5E1E]/30 transition-all glow-neon-orange cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 text-[#8A6A54] hover:text-[#2A1A12] text-xs font-mono-tech font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
