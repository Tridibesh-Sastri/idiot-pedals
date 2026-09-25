import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CreditCard,
  Banknote,
  ArrowRight,
  Lock,
  Truck,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { ShippingAddress, PaymentMethod } from '../types';
import { sanitizeString } from '../lib/security';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, total, clearCart } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.name || 'Arjun Sen');
  const [email, setEmail] = useState(user?.email || 'arjun.sen@guitarist.in');
  const [phone, setPhone] = useState(user?.phone || '+91 98301 23456');
  const [addressLine1, setAddressLine1] = useState('Flat 4B, Harmony Heights, 14 Lake Temple Road');
  const [addressLine2, setAddressLine2] = useState('Near Southern Avenue');
  const [city, setCity] = useState('Burdwan');
  const [state, setState] = useState('West Bengal');
  const [postalCode, setPostalCode] = useState('700029');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] bg-[#FFF8F1] text-[#2A1A12] flex flex-col items-center justify-center px-4 pt-28">
        <div className="max-w-md w-full bg-white border border-[#F0D3B8] rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <IdiotPedalsLogo variant="light" size="sm" />
          <h2 className="text-2xl font-editorial font-bold text-[#2A1A12]">
            No Items in Checkout
          </h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Add the Neon Fuzz Box to your workbench cart before heading to checkout.
          </p>
          <Link
            to="/"
            className="inline-block px-8 py-3.5 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
          >
            Back To Home
          </Link>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return; // Prevent double submission

    // TOCTOU snapshot: freeze the cart the user is paying for at submit time.
    // Everything below (Razorpay amount, order payload) uses this snapshot,
    // never the live closure values across awaits.
    const orderItems = items.map((i) => ({ ...i }));
    const snapshotTotal = orderItems.reduce(
      (sum, i) => sum + i.price * Math.min(5, Math.max(1, i.quantity)),
      0
    );

    const cleanName = sanitizeString(fullName);
    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    const cleanPhone = phone.trim().replace(/[^\d+]/g, '').slice(0, 20);
    const cleanAddress1 = sanitizeString(addressLine1);
    const cleanAddress2 = sanitizeString(addressLine2);
    const cleanCity = sanitizeString(city);
    const cleanState = sanitizeString(state);
    const cleanPostal = postalCode.trim().replace(/\D/g, '');

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanAddress1 || !cleanCity || !cleanPostal) {
      showToast('Please fill in all required shipping fields.', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }

    if (cleanPhone.replace(/\D/g, '').length < 10) {
      showToast('Please enter a valid 10-digit phone number.', 'error');
      return;
    }

    if (cleanPostal.length !== 6) {
      showToast('Please enter a valid 6-digit postal PIN code.', 'error');
      return;
    }

    setIsProcessing(true);

    const shippingAddress: ShippingAddress = {
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      addressLine1: cleanAddress1,
      addressLine2: cleanAddress2,
      city: cleanCity,
      state: cleanState,
      postalCode: cleanPostal,
      country: 'India',
    };

    try {
      if (paymentMethod === 'razorpay') {
        const rzpOrder = await paymentService.createRazorpayOrder(snapshotTotal);
        setIsRazorpayModalOpen(true);

        setTimeout(async () => {
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: rzpOrder.id,
              razorpay_payment_id: `pay_${Date.now()}`,
              razorpay_signature: 'sig_mock_verified',
            });

            const order = await orderService.createOrder({
              userId: user?.id || 'usr_guest',
              items: orderItems,
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
        const order = await orderService.createOrder({
          userId: user?.id || 'usr_guest',
          items: orderItems,
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
    <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 overflow-hidden relative">
      {/* Glow */}
      <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8 border-b border-[#F0D3B8] pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-editorial font-normal uppercase text-[#2A1A12]">
              Direct Workbench Checkout
            </h1>
            <p className="text-xs text-[#8A6A54] font-mono-tech">
              100% Secure Checkout • Direct from Burdwan Audio Workshop
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-600 font-mono-tech">
            <Lock size={14} />
            <span>256-Bit Encrypted</span>
          </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Contact, Address, Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Customer Info */}
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#2A1A12] font-bold pb-2 border-b border-[#F0D3B8]">
                <span className="w-5 h-5 rounded-full bg-[#FF5E1E] text-white flex items-center justify-center text-[10px] font-mono-tech">
                  1
                </span>
                <span>Contact & Courier Updates</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    Phone (for Delivery SMS) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Email Address (for Invoice & Tracking Link) *
                </label>
                  <input
                    type="email"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>
            </div>

            {/* Step 2: Shipping Destination */}
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#2A1A12] font-bold pb-2 border-b border-[#F0D3B8]">
                <span className="w-5 h-5 rounded-full bg-[#FF5E1E] text-white flex items-center justify-center text-[10px] font-mono-tech">
                  2
                </span>
                <span>Shipping Address (India)</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Address Line 1 (Flat, House, Building, Street) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                  Address Line 2 (Landmark, Area, Sector)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono-tech uppercase text-[#8A6A54] tracking-wider block">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment Options */}
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#2A1A12] font-bold pb-2 border-b border-[#F0D3B8]">
                <span className="w-5 h-5 rounded-full bg-[#FF5E1E] text-white flex items-center justify-center text-[10px] font-mono-tech">
                  3
                </span>
                <span>Payment Method</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Razorpay Online */}
                <label
                  onClick={() => setPaymentMethod('razorpay')}
                  className={`p-5 rounded-2xl border cursor-pointer flex flex-col justify-between space-y-2.5 transition-all ${
                    paymentMethod === 'razorpay'
                      ? 'bg-[#FFF1E6] border-[#FF5E1E] shadow-lg shadow-[#FF5E1E]/10 glow-neon-subtle'
                      : 'bg-[#FFF1E6] border-[#F0D3B8] text-[#8A6A54] hover:border-[#FF5E1E]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard size={18} className="text-[#FF5E1E]" />
                      <span className="text-xs font-bold font-mono-tech text-[#2A1A12]">
                        Razorpay Secure
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'razorpay'
                          ? 'border-[#FF5E1E] bg-[#FF5E1E]'
                          : 'border-[#E4C3A5]'
                      }`}
                    >
                      {paymentMethod === 'razorpay' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8A6A54] font-light">
                    UPI (GPay / PhonePe / Paytm), Credit / Debit Cards, Netbanking.
                  </p>
                </label>

                {/* Cash on Delivery */}
                <label
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-5 rounded-2xl border cursor-pointer flex flex-col justify-between space-y-2.5 transition-all ${
                    paymentMethod === 'cod'
                      ? 'bg-[#FFF1E6] border-[#FF5E1E] shadow-lg shadow-[#FF5E1E]/10 glow-neon-subtle'
                      : 'bg-[#FFF1E6] border-[#F0D3B8] text-[#8A6A54] hover:border-[#FF5E1E]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Banknote size={18} className="text-[#FF5E1E]" />
                      <span className="text-xs font-bold font-mono-tech text-[#2A1A12]">
                        Cash on Delivery
                      </span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'cod'
                          ? 'border-[#FF5E1E] bg-[#FF5E1E]'
                          : 'border-[#E4C3A5]'
                      }`}
                    >
                      {paymentMethod === 'cod' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8A6A54] font-light">
                    Pay cash upon delivery to the Blue Dart express courier.
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary, Trust Badges, Submit */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
              <h3 className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold pb-3 border-b border-[#F0D3B8]">
                Order Summary
              </h3>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3.5 items-center">
                    <div className="w-12 h-14 bg-[#FFF1E6] rounded-xl p-1.5 flex flex-col items-center justify-between text-[#2A1A12] shrink-0 border border-[#F0D3B8] shadow-inner">
                      <div className="w-full flex justify-around">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]"></div>
                      </div>
                      <div className="text-[7px] font-mono-tech font-bold leading-none">IDIOT</div>
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 border border-zinc-400"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#2A1A12] font-mono-tech truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#8A6A54]">
                        Qty: {item.quantity} × ₹{item.price.toLocaleString()}
                      </div>
                    </div>

                    <div className="text-xs font-bold font-mono-tech text-[#2A1A12]">
                      ₹{(item.price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculation Breakdown */}
              <div className="space-y-2 pt-4 border-t border-[#F0D3B8] text-xs font-mono-tech">
                <div className="flex justify-between text-[#8A6A54]">
                  <span>Subtotal</span>
                  <span className="text-[#2A1A12]">₹{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-[#8A6A54]">
                  <span>Insured Express Shipping</span>
                  <span className="text-emerald-600 font-bold uppercase text-[11px]">Free</span>
                </div>

                <div className="flex justify-between text-base font-bold pt-3 border-t border-[#F0D3B8] text-[#2A1A12]">
                  <span>Total Amount</span>
                  <span className="text-xl font-extrabold text-[#2A1A12]">
                    ₹{total.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {isProcessing
                    ? 'Connecting to Workbench...'
                    : paymentMethod === 'razorpay'
                    ? `Pay ₹${total.toLocaleString()} via Razorpay`
                    : `Confirm Order (Cash on Delivery) — ₹${total.toLocaleString()}`}
                </span>
                <ArrowRight size={14} />
              </button>

              {/* Delivery Assurance */}
              <div className="p-4 bg-[#FFF1E6] rounded-2xl border border-[#F0D3B8] text-[11px] text-[#8A6A54] space-y-1 font-mono-tech">
                <div className="flex items-center gap-2 text-[#2A1A12] font-medium">
                  <Truck size={14} className="text-[#FF5E1E]" />
                  <span>Estimated Arrival: 2 - 4 Business Days</span>
                </div>
                <p className="font-light">
                  Dispatches directly from Burdwan Audio Labs. Tracking link sent via SMS upon handover.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* RAZORPAY MODAL POPUP SIMULATOR */}
      {isRazorpayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-white border border-[#FF5E1E]/40 rounded-3xl p-8 max-w-sm w-full text-center space-y-4 shadow-2xl glow-neon-subtle animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#FF7A00] to-[#FF4500] border border-[#FF5E1E]/30 flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/30">
              <Lock size={22} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-mono-tech text-[#2A1A12]">
                Razorpay Checkout Gateway
              </h3>
              <p className="text-xs text-[#8A6A54] font-mono-tech">
                Verifying token for ₹{total.toLocaleString()} INR...
              </p>
            </div>
            <div className="w-full bg-[#F5E3D2] h-2 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#FF7A00] to-[#FF4500] animate-pulse w-3/4 rounded-full" />
            </div>
            <div className="text-[11px] text-[#8A6A54] font-mono-tech">
              Connecting to secure bank servers...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
