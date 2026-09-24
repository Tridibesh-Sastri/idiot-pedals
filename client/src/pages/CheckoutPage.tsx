import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { ShippingAddress, PaymentMethod } from '../types';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';

/**
 * CheckoutPage Component
 *
 * Facilitates the complete single-page checkout flow:
 * 1. Customer contact & delivery address validation.
 * 2. Payment method selection (Razorpay Online Gateway vs. Cash on Delivery).
 * 3. Payment signature verification and order creation dispatch via orderService.
 * 4. Automatic cart clearing and redirection to the chronological tracking page.
 */
export const CheckoutPage: React.FC = () => {
  // Global cart state and clearing hook
  const { items, subtotal, shippingFee, total, clearCart } = useCart();
  // Active authenticated user profile (pre-populates fields if logged in)
  const { user } = useAuth();
  // Global toast alerts
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Controlled Form States for delivery address
  const [fullName, setFullName] = useState(user?.name || 'Arjun Sen');
  const [email, setEmail] = useState(user?.email || 'arjun.sen@guitarist.in');
  const [phone, setPhone] = useState(user?.phone || '+91 98301 23456');
  const [addressLine1, setAddressLine1] = useState('Flat 4B, Harmony Heights, 14 Lake Temple Road');
  const [addressLine2, setAddressLine2] = useState('Near Southern Avenue');
  const [city, setCity] = useState('Kolkata');
  const [state, setState] = useState('West Bengal');
  const [postalCode, setPostalCode] = useState('700029');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

  // UI status flags
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  // If cart is empty, redirect or prompt
  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] bg-[#0B0B0A] text-[#F3EFE6] flex flex-col items-center justify-center px-4 pt-20">
        <div className="max-w-md w-full bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <IdiotPedalsLogo variant="dark" size="sm" />
          <h2 className="text-xl font-bold font-cinzel text-[#F3EFE6]">
            No Items in Checkout
          </h2>
          <p className="text-xs text-[#8C857A]">
            Add the Neon Fuzz Box to your workbench cart before heading to checkout.
          </p>
          <Link
            to="/product"
            className="inline-block px-6 py-3 bg-[#D91E18] text-white text-xs font-mono-tech font-bold uppercase rounded shadow"
          >
            Go To Product Page
          </Link>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !phone || !addressLine1 || !city || !postalCode) {
      showToast('Please fill in all required shipping fields.', 'error');
      return;
    }

    setIsProcessing(true);

    const shippingAddress: ShippingAddress = {
      fullName,
      email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country: 'India',
    };

    try {
      if (paymentMethod === 'razorpay') {
        // Step 1: Create Razorpay Order via backend service
        const rzpOrder = await paymentService.createRazorpayOrder(total);
        setIsRazorpayModalOpen(true);

        // Simulate Razorpay secure checkout dialog completion
        setTimeout(async () => {
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: rzpOrder.id,
              razorpay_payment_id: `pay_${Date.now()}`,
              razorpay_signature: 'sig_mock_verified',
            });

            // Step 2: Finalize order on backend
            const order = await orderService.createOrder({
              userId: user?.id || 'usr_guest',
              items,
              shippingAddress,
              paymentMethod: 'razorpay',
              paymentId: `pay_${Date.now()}`,
            });

            setIsRazorpayModalOpen(false);
            clearCart();
            showToast('Payment verified! Workbench order ticket created.');
            navigate(`/orders/${order.id}`);
          } catch {
            setIsRazorpayModalOpen(false);
            showToast('Payment verification failed.', 'error');
            setIsProcessing(false);
          }
        }, 1200);
      } else {
        // Cash on delivery
        const order = await orderService.createOrder({
          userId: user?.id || 'usr_guest',
          items,
          shippingAddress,
          paymentMethod: 'cod',
        });

        clearCart();
        showToast('Order confirmed via Cash on Delivery!');
        navigate(`/orders/${order.id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create order.';
      showToast(msg, 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-[#0B0B0A] text-[#F3EFE6] pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-[#8C857A]/20 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-cinzel font-black uppercase text-[#F3EFE6]">
              Direct Workbench Checkout
            </h1>
            <p className="text-xs text-[#8C857A]">
              100% Secure Checkout • Direct from Kolkata Audio Workshop
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-400 font-mono-tech">
            <Lock size={14} />
            <span>256-Bit Encrypted</span>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Contact, Address, Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Customer Info */}
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold pb-2 border-b border-[#8C857A]/20">
                <span className="w-5 h-5 rounded-full bg-[#D91E18] text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Contact & Courier Updates</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                    Phone (for Delivery SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                  Email Address (for Invoice & Tracking Link) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
              </div>
            </div>

            {/* Step 2: Shipping Destination */}
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold pb-2 border-b border-[#8C857A]/20">
                <span className="w-5 h-5 rounded-full bg-[#D91E18] text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Shipping Address (India)</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                  Address Line 1 (Flat, House, Building, Street) *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                  Address Line 2 (Landmark, Area, Sector)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] focus:outline-none focus:border-[#D91E18]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8C857A] block">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#0B0B0A] border border-[#8C857A]/30 rounded-lg px-3.5 py-2.5 text-xs text-[#F3EFE6] font-mono-tech focus:outline-none focus:border-[#D91E18]"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment Options */}
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold pb-2 border-b border-[#8C857A]/20">
                <span className="w-5 h-5 rounded-full bg-[#D91E18] text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Payment Method</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Razorpay Online */}
                <label
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between space-y-2 transition-all ${
                    paymentMethod === 'razorpay'
                      ? 'bg-[#0B0B0A] border-[#D91E18] shadow-md'
                      : 'bg-[#171513] border-[#8C857A]/30 text-[#8C857A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-[#D91E18]" />
                      <span className="text-xs font-bold text-[#F3EFE6]">
                        Razorpay Secure
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'razorpay'
                          ? 'border-[#D91E18] bg-[#D91E18]'
                          : 'border-[#8C857A]'
                      }`}
                    >
                      {paymentMethod === 'razorpay' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8C857A]">
                    UPI (GPay / PhonePe / Paytm), Credit / Debit Cards, Netbanking.
                  </p>
                </label>

                {/* Cash on Delivery */}
                <label
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between space-y-2 transition-all ${
                    paymentMethod === 'cod'
                      ? 'bg-[#0B0B0A] border-[#D91E18] shadow-md'
                      : 'bg-[#171513] border-[#8C857A]/30 text-[#8C857A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote size={18} className="text-[#D91E18]" />
                      <span className="text-xs font-bold text-[#F3EFE6]">
                        Cash on Delivery
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'cod'
                          ? 'border-[#D91E18] bg-[#D91E18]'
                          : 'border-[#8C857A]'
                      }`}
                    >
                      {paymentMethod === 'cod' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8C857A]">
                    Pay cash upon delivery to the Blue Dart express courier.
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary, Trust Badges, Submit */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 shadow-2xl space-y-6">
              <h3 className="text-sm font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold pb-3 border-b border-[#8C857A]/20">
                Order Summary
              </h3>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <div className="w-12 h-14 bg-[#F3EFE6] rounded p-1.5 flex flex-col items-center justify-between text-[#0B0B0A] shrink-0 border border-[#8C857A]/40">
                      <div className="w-full flex justify-around">
                        <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                      </div>
                      <div className="text-[7px] font-black leading-none">IDIOT</div>
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-zinc-500"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#F3EFE6] truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#8C857A]">
                        Qty: {item.quantity} × ₹{item.price.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-xs font-bold font-mono-tech text-[#F3EFE6]">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculation Breakdown */}
              <div className="space-y-2 pt-4 border-t border-[#8C857A]/20 text-xs">
                <div className="flex justify-between text-[#8C857A]">
                  <span>Subtotal</span>
                  <span className="text-[#F3EFE6] font-mono-tech">₹{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-[#8C857A]">
                  <span>Insured Express Shipping</span>
                  <span className="text-emerald-400 font-bold uppercase text-[11px]">Free</span>
                </div>

                <div className="flex justify-between text-base font-bold pt-3 border-t border-[#8C857A]/20 text-[#F3EFE6]">
                  <span>Total Amount</span>
                  <span className="text-lg font-black font-mono-tech text-[#F3EFE6]">
                    ₹{total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-[#D91E18] hover:bg-[#b51712] text-white text-xs font-mono-tech font-bold uppercase rounded flex items-center justify-center gap-2 shadow-xl shadow-[#D91E18]/30 transition-all disabled:opacity-50"
              >
                {isProcessing
                  ? 'Connecting to Workbench...'
                  : paymentMethod === 'razorpay'
                  ? `Pay ₹${total.toLocaleString()} via Razorpay`
                  : `Confirm Order (Cash on Delivery) — ₹${total.toLocaleString()}`}
                <ArrowRight size={14} />
              </button>

              {/* Delivery Assurance */}
              <div className="p-3 bg-[#0B0B0A] rounded-lg border border-[#8C857A]/20 text-[11px] text-[#8C857A] space-y-1.5">
                <div className="flex items-center gap-2 text-[#F3EFE6] font-medium">
                  <Truck size={14} className="text-[#D91E18]" />
                  <span>Estimated Arrival: 2 - 4 Business Days</span>
                </div>
                <p>
                  Dispatches directly from Kolkata Audio Labs. Tracking link sent via SMS upon handover.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* RAZORPAY MODAL POPUP SIMULATOR */}
      {isRazorpayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0B0B0A] border-2 border-[#D91E18] rounded-2xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#171513] border border-[#8C857A]/40 flex items-center justify-center text-[#D91E18]">
              <Lock size={22} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#F3EFE6]">
                Razorpay Checkout Gateway
              </h3>
              <p className="text-xs text-[#8C857A]">
                Verifying token for ₹{total.toLocaleString()} INR...
              </p>
            </div>
            <div className="w-full bg-[#171513] h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#D91E18] animate-pulse w-3/4" />
            </div>
            <div className="text-[11px] text-[#8C857A]">
              Connecting to secure bank servers...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
