import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { IdiotPedalsLogo } from './IdiotPedalsLogo';

export const CartDrawer: React.FC = () => {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeItem, subtotal, total, shippingFee } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0B0B0A] border-l border-[#8C857A]/20 flex flex-col shadow-2xl text-[#F3EFE6]">
          {/* Header */}
          <div className="p-6 border-b border-[#8C857A]/20 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight uppercase flex items-center gap-2">
                Your Workbench Cart
              </h2>
              <p className="text-xs text-[#8C857A] tracking-wider">Direct from IDIOT Pedals Lab</p>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-[#8C857A] hover:text-[#F3EFE6] transition-colors rounded-lg hover:bg-[#171513]"
              aria-label="Close cart"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cart Contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#171513] border border-[#8C857A]/30 flex items-center justify-center text-[#8C857A]">
                  <IdiotPedalsLogo variant="dark" size="sm" />
                </div>
                <h3 className="text-base font-bold text-[#F3EFE6]">Your cart is empty</h3>
                <p className="text-xs text-[#8C857A] max-w-xs mx-auto">
                  Add the Neon Fuzz Box to your setup and hear what serious analog character sounds like.
                </p>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/product');
                  }}
                  className="px-6 py-2.5 bg-[#D91E18] text-white text-xs font-bold tracking-widest uppercase rounded hover:bg-[#b51712] transition-colors"
                >
                  Explore Neon Fuzz Box
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-[#171513] border border-[#8C857A]/25 rounded-lg space-y-4"
                >
                  <div className="flex gap-4">
                    {/* Visual pedal badge preview */}
                    <div className="w-20 h-24 bg-[#F3EFE6] rounded p-2 flex flex-col items-center justify-between text-[#0B0B0A] shadow-md border border-[#8C857A]/40 shrink-0 relative overflow-hidden">
                      <div className="w-full flex justify-around">
                        <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
                      </div>
                      <div className="text-center my-auto">
                        <div className="text-[10px] font-black tracking-tight leading-none">IDIOT</div>
                        <div className="text-[8px] font-bold text-[#D91E18] italic leading-none">Pedals</div>
                      </div>
                      <div className="w-4 h-4 rounded-full bg-zinc-300 border border-zinc-500 shadow-inner"></div>
                      <div className="absolute bottom-2 left-1.5 w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_6px_red]"></div>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="font-bold text-sm text-[#F3EFE6] uppercase tracking-wide">
                            {item.name}
                          </h4>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-[#8C857A] hover:text-[#D91E18] text-xs transition-colors p-1"
                            title="Remove from cart"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-[#8C857A] line-clamp-1 mt-0.5">{item.subtitle}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-[#8C857A]/30 rounded bg-[#0B0B0A]">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1.5 text-[#8C857A] hover:text-white transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-3 text-xs font-bold text-[#F3EFE6]">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1.5 text-[#8C857A] hover:text-white transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="text-sm font-bold text-[#F3EFE6]">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </span>
                          {item.originalPrice && (
                            <div className="text-[10px] text-[#8C857A] line-through">
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
              <div className="p-3 bg-[#171513]/50 border border-[#8C857A]/15 rounded text-xs space-y-2 text-[#8C857A]">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-[#D91E18]" />
                  <span>Free doorstep shipping across India via Blue Dart Express</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-[#D91E18]" />
                  <span>1-Year comprehensive workshop warranty & tech support</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer / Summary */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#8C857A]/20 bg-[#171513]/30 space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#8C857A]">
                  <span>Subtotal</span>
                  <span className="text-[#F3EFE6] font-medium">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#8C857A]">
                  <span>Shipping</span>
                  <span className="text-emerald-400 font-semibold uppercase text-[11px]">Free</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#8C857A]/20 text-[#F3EFE6]">
                  <span>Total Amount</span>
                  <span className="text-base font-black text-[#F3EFE6]">₹{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 bg-[#D91E18] hover:bg-[#b51712] text-white font-bold tracking-widest uppercase rounded flex items-center justify-center gap-2 text-xs transition-colors shadow-lg shadow-[#D91E18]/25"
                >
                  Proceed to Checkout
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 text-[#8C857A] hover:text-[#F3EFE6] text-xs font-semibold tracking-wider uppercase transition-colors"
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
