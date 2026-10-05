import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, Banknote, ArrowRight, Lock, Truck, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { getActiveProducts } from '../services/productService';
import { ApiError, describeApiError } from '../lib/api';
import { sanitizeString } from '../lib/security';
import { isValidPhone, isValidPinCode, normalizePhoneDigits, normalizePinCode } from '../lib/validation';
import { ShippingAddress, PaymentMethod, User, UserAddress } from '../types';
import { userService } from '../services/userService';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';
import { LoadingState } from '../components/common/AsyncState';

/**
 * Picks the checkout contact from a profile. Pure and null-safe: the User
 * type promises a string phone and an address array, but any un-normalised
 * shape (stale cache, future producer) must degrade to empty, never throw.
 */
export interface CheckoutContactSelection {
  phone: string;
  address: UserAddress | null;
  hasPhone: boolean;
  hasAddress: boolean;
}

export function selectCheckoutContact(user: User | null | undefined): CheckoutContactSelection {
  const phone = typeof user?.phone === 'string' ? user.phone : '';
  const addresses = Array.isArray(user?.addresses)
    ? user.addresses.filter((entry): entry is UserAddress => !!entry && typeof entry === 'object')
    : [];
  const address = addresses.find((entry) => entry.isDefault) ?? addresses[0] ?? null;
  return {
    phone,
    address,
    hasPhone: phone.trim().length > 0,
    hasAddress: address !== null,
  };
}

export interface NewAddressFields {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
}

/**
 * Builds the saved-address entry for a newly typed address. Labels it
 * 'Home' for a first address, 'Address N' afterwards so picker rows stay
 * distinguishable. Pure and unit-tested.
 */
export function buildSavedAddressEntry(fields: NewAddressFields, existingCount: number): UserAddress {
  return {
    label: existingCount <= 0 ? 'Home' : `Address ${existingCount + 1}`,
    name: fields.name,
    phone: fields.phone,
    addressLine1: fields.addressLine1,
    addressLine2: fields.addressLine2 || undefined,
    city: fields.city,
    state: fields.state,
    postalCode: fields.postalCode,
    country: 'India',
    isDefault: existingCount <= 0,
  };
}

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, total, clearCart, replaceItem, removeItem, updateQuantity } = useCart();
  const { user, isAuthenticated, initializing, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const [checkingCart, setCheckingCart] = useState(true);
  const [cartWarning, setCartWarning] = useState<string[]>([]);
  const [priceNotice, setPriceNotice] = useState<string[]>([]);

  // Saved-contact reuse: summary mode shows the preselected phone + address
  // with a Change action; edit mode shows the picker + full form.
  const [editingContact, setEditingContact] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saveAddress, setSaveAddress] = useState(true);
  const [addressNotice, setAddressNotice] = useState('');
  const contactInitRef = useRef(false);

  const submittedRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Prefill from the signed-in profile                                       */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!user) return;
    const selection = selectCheckoutContact(user);
    setFullName((prev) => prev || user.name);
    setEmail((prev) => prev || user.email);
    setPhone((prev) => prev || selection.phone.replace(/\D/g, '').slice(0, 10));

    if (selection.address) {
      const { address } = selection;
      setAddressLine1((prev) => prev || address.addressLine1);
      setAddressLine2((prev) => prev || address.addressLine2 || '');
      setCity((prev) => prev || address.city);
      setState((prev) => prev || address.state);
      setPostalCode((prev) => prev || address.postalCode);
    }
  }, [user]);

  // One-time contact setup: users with a phone and a saved address start in
  // summary mode with the default preselected; everyone else gets the form.
  useEffect(() => {
    if (!user || contactInitRef.current) return;
    contactInitRef.current = true;
    const selection = selectCheckoutContact(user);
    const addresses = Array.isArray(user.addresses) ? user.addresses : [];
    if (selection.hasPhone && selection.hasAddress && selection.address) {
      const defaultIndex = addresses.indexOf(selection.address);
      setSelectedIndex(defaultIndex >= 0 ? defaultIndex : 0);
      setEditingContact(false);
    }
    setSaveAddress(true);
  }, [user]);

  const fillFieldsFromAddress = (address: UserAddress) => {
    setAddressLine1(address.addressLine1 ?? '');
    setAddressLine2(address.addressLine2 ?? '');
    setCity(address.city ?? '');
    setState(address.state ?? '');
    setPostalCode(address.postalCode ?? '');
  };

  const clearAddressFields = () => {
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPostalCode('');
  };

  const chooseSavedAddress = (index: number) => {
    const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
    const address = addresses[index];
    if (!address) return;
    setSelectedIndex(index);
    fillFieldsFromAddress(address);
  };

  const chooseNewAddress = () => {
    setSelectedIndex(null);
    clearAddressFields();
  };

  /* ---------------------------------------------------------------------- */
  /* Reconcile the cart against the live catalogue (stale/deleted products)  */
  /* ---------------------------------------------------------------------- */

  const reconcileCart = useCallback(async () => {
    if (items.length === 0) {
      setCheckingCart(false);
      return;
    }

    setCheckingCart(true);
    try {
      const products = await getActiveProducts(100);
      const byId = new Map(products.map((product) => [product.id, product]));

      const removed: string[] = [];
      const changed: string[] = [];

      for (const item of items) {
        const product = byId.get(item.id);

        if (!product || product.availableStock <= 0) {
          removed.push(item.name);
          removeItem(item.id);
          continue;
        }

        if (product.price !== item.price) {
          changed.push(`${product.name}: ₹${item.price.toLocaleString('en-IN')} → ₹${product.price.toLocaleString('en-IN')}`);
          replaceItem({
            ...item,
            name: product.name,
            subtitle: product.sku || product.slug,
            price: product.price,
            image: product.images[0] ?? item.image,
            availableStock: product.availableStock,
          });
        }

        if (item.quantity > product.availableStock) {
          updateQuantity(item.id, Math.min(item.quantity, product.availableStock));
        }
      }

      setCartWarning(removed);
      setPriceNotice(changed);
    } catch {
      // If the catalogue is unreachable, do not block checkout — the server
      // recalculates everything and will reject unavailable products anyway.
      setCartWarning([]);
      setPriceNotice([]);
    } finally {
      setCheckingCart(false);
    }
    // Intentionally runs once on mount against the cart snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reconcileCart();
  }, [reconcileCart]);

  /* ---------------------------------------------------------------------- */
  /* Submit                                                                   */
  /* ---------------------------------------------------------------------- */

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing || submittedRef.current) return;
    if (!isAuthenticated) return;

    setSubmitError(null);

    if (items.length === 0) {
      setSubmitError(new ApiError('validation', 'Your cart is empty. Add a pedal before checking out.'));
      return;
    }

    const cleanName = sanitizeString(fullName);
    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    const cleanPhone = normalizePhoneDigits(phone.trim());
    const cleanAddress1 = sanitizeString(addressLine1);
    const cleanAddress2 = sanitizeString(addressLine2);
    const cleanCity = sanitizeString(city);
    const cleanState = sanitizeString(state);
    const cleanPostal = normalizePinCode(postalCode.trim());

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanAddress1 || !cleanCity || !cleanState || !cleanPostal) {
      setSubmitError(new ApiError('validation', 'Please fill in all required shipping fields.'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSubmitError(new ApiError('validation', 'Please enter a valid email address.'));
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      setSubmitError(new ApiError('validation', 'Please enter a valid 10-digit phone number.'));
      return;
    }

    if (!isValidPinCode(cleanPostal)) {
      setSubmitError(new ApiError('validation', 'Please enter a valid 6-digit postal PIN code.'));
      return;
    }

    setAddressNotice('');

    // Ask-once phone: the profile lacks one, so save it before ordering.
    // A failure blocks here — the order needs a reachable number anyway.
    if (user && !selectCheckoutContact(user).hasPhone) {
      try {
        await userService.updateProfile({ phone: cleanPhone });
        await refreshUser();
      } catch (error) {
        setSubmitError(new ApiError('validation', `Could not save your phone number: ${describeApiError(error)}`));
        return;
      }
    }

    // Ask-once address: persist a newly typed address when asked. Best
    // effort — a save failure must never block the order itself.
    const savedAddresses = Array.isArray(user?.addresses) ? user.addresses : [];
    if (user && saveAddress && selectedIndex === null) {
      try {
        await userService.updateProfile({
          addresses: [
            ...savedAddresses,
            buildSavedAddressEntry(
              {
                name: cleanName,
                phone: cleanPhone,
                addressLine1: cleanAddress1,
                addressLine2: cleanAddress2 || undefined,
                city: cleanCity,
                state: cleanState,
                postalCode: cleanPostal,
              },
              savedAddresses.length
            ),
          ],
        });
        await refreshUser();
      } catch {
        setAddressNotice('Note: this address could not be saved for next time, but your order can still proceed.');
      }
    }

    // TOCTOU snapshot: freeze the cart the user is paying for at submit time.
    const orderItems = items.map((item) => ({ productId: item.id, quantity: item.quantity }));

    const shippingAddress: ShippingAddress = {
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      addressLine1: cleanAddress1,
      addressLine2: cleanAddress2 || undefined,
      city: cleanCity,
      state: cleanState,
      postalCode: cleanPostal,
      country: 'India',
    };

    setIsProcessing(true);
    submittedRef.current = true;

    let createdOrderId: string | null = null;

    try {
      // 1. Create the order server-side (client sends productId + quantity only).
      const order = await orderService.createOrder({
        items: orderItems,
        paymentMethod,
        shippingAddress,
      });

      createdOrderId = order.id;

      if (paymentMethod === 'cod') {
        clearCart();
        showToast('Order confirmed via Cash on Delivery!');
        navigate(`/orders/${order.id}`);
        return;
      }

      // 2. Razorpay: create payment order -> modal -> server verification.
      if (!order.serverId) {
        throw new ApiError('server', 'The order was created but cannot be paid for. Please contact support.');
      }

      const outcome = await paymentService.payWithRazorpay({
        orderId: order.serverId,
        amountLabel: order.orderNumber,
        prefill: { name: cleanName, email: cleanEmail, contact: cleanPhone },
      });

      if (outcome.type === 'verified') {
        clearCart();
        showToast('Payment verified! Workbench order ticket created.');
        navigate(`/orders/${order.id}`);
        return;
      }

      if (outcome.type === 'dismissed') {
        showToast('Payment cancelled. Your order is saved as pending.', 'info');
        navigate(`/orders/${order.id}`);
        return;
      }

      // failed verification — order remains pending, never marked paid client-side
      showToast(describeApiError(outcome.error), 'error');
      navigate(`/orders/${order.id}`);
    } catch (err: unknown) {
      submittedRef.current = false;
      setSubmitError(err);

      if (createdOrderId) {
        showToast('Payment could not be started. Your order is saved as pending.', 'error');
        navigate(`/orders/${createdOrderId}`);
      } else {
        showToast(describeApiError(err), 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Guards                                                                   */
  /* ---------------------------------------------------------------------- */

  if (initializing) {
    return (
      <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 min-h-screen px-4">
        <div className="max-w-3xl mx-auto">
          <LoadingState message="Preparing checkout…" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] bg-[#FFF8F1] text-[#2A1A12] flex flex-col items-center justify-center px-4 pt-28">
        <div className="max-w-md w-full bg-white border border-[#F0D3B8] rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <IdiotPedalsLogo variant="light" size="sm" />
          <h2 className="text-2xl font-editorial font-bold text-[#2A1A12]">Sign In To Checkout</h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Please sign in so we can attach this order to your account and send tracking updates.
          </p>
          <Link
            to="/login"
            state={{ from: '/checkout' }}
            className="inline-block px-8 py-3.5 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] bg-[#FFF8F1] text-[#2A1A12] flex flex-col items-center justify-center px-4 pt-28">
        <div className="max-w-md w-full bg-white border border-[#F0D3B8] rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <IdiotPedalsLogo variant="light" size="sm" />
          <h2 className="text-2xl font-editorial font-bold text-[#2A1A12]">No Items in Checkout</h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Browse the workbench collection and add a pedal before heading to checkout.
          </p>
          <Link
            to="/products"
            className="inline-block px-8 py-3.5 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
          >
            Shop Pedals
          </Link>
        </div>
      </div>
    );
  }

  const submitErrorMessage =
    submitError instanceof ApiError || submitError instanceof Error ? submitError.message : '';

  const savedContactAddresses = Array.isArray(user?.addresses)
    ? user.addresses.filter((entry): entry is UserAddress => !!entry && typeof entry === 'object')
    : [];
  const contactLocked = !editingContact && !!user;

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

        {/* Cart reconciliation notices */}
        {cartWarning.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-500/40 rounded-2xl text-xs font-mono-tech text-[#2A1A12] flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <span>
              These items were removed because they are no longer available:{' '}
              <span className="font-bold">{cartWarning.join(', ')}</span>.
            </span>
          </div>
        )}

        {priceNotice.length > 0 && (
          <div className="mb-6 p-4 bg-sky-50 border border-sky-500/40 rounded-2xl text-xs font-mono-tech text-[#2A1A12] flex items-start gap-2.5">
            <Info size={15} className="text-sky-600 mt-0.5 shrink-0" />
            <span>
              Prices were updated to the current catalogue: <span className="font-bold">{priceNotice.join(' • ')}</span>
            </span>
          </div>
        )}

        {submitErrorMessage && (
          <div className="mb-6">
            <div className="p-4 bg-red-50 border border-red-500/40 rounded-2xl text-xs font-mono-tech text-[#2A1A12] flex items-start gap-2.5">
              <AlertCircle size={15} className="text-[#FF5E1E] mt-0.5 shrink-0" />
              <div className="space-y-1">
                <span>{submitErrorMessage}</span>
                {submitError instanceof ApiError && submitError.fieldErrors.length > 0 && (
                  <ul className="space-y-0.5 text-[11px] text-[#8A6A54]">
                    {submitError.fieldErrors.slice(0, 5).map((fieldError) => (
                      <li key={`${fieldError.field}-${fieldError.message}`}>
                        <span className="text-[#2A1A12] font-bold">{fieldError.field}:</span> {fieldError.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {checkingCart ? (
          <LoadingState message="Confirming prices and stock…" />
        ) : (
          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6">

              {contactLocked && user ? (
                <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#F0D3B8]">
                    <div className="text-xs font-mono-tech uppercase tracking-wider text-[#2A1A12] font-bold">
                      Deliver to
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingContact(true)}
                      className="px-4 py-2 bg-[#FFF1E6] border border-[#F0D3B8] text-[11px] font-mono-tech font-bold uppercase rounded-full text-[#2A1A12] hover:border-[#FF5E1E] transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                  <div className="text-sm font-bold text-[#2A1A12]">{fullName || user.name}</div>
                  <div className="text-xs text-[#8A6A54] font-mono-tech">{phone}</div>
                  <div className="text-xs text-[#8A6A54] font-mono-tech leading-relaxed">
                    {addressLine1}
                    {addressLine2 ? `, ${addressLine2}` : ''}, {city}, {state} - {postalCode}
                  </div>
                </div>
              ) : (
              <>

              {editingContact && savedContactAddresses.length > 0 && (
                <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-3 backdrop-blur-xl">
                  <div className="text-xs font-mono-tech uppercase tracking-wider text-[#2A1A12] font-bold pb-2 border-b border-[#F0D3B8]">
                    Saved addresses
                  </div>
                  {savedContactAddresses.map((saved, index) => (
                    <label
                      key={saved.id ?? `${saved.addressLine1}-${index}`}
                      className="flex items-start gap-2.5 p-3 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl text-xs cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        checked={selectedIndex === index}
                        onChange={() => chooseSavedAddress(index)}
                        className="mt-0.5 accent-[#FF5E1E]"
                      />
                      <span className="text-[#2A1A12]">
                        <span className="font-bold">{saved.label || 'Address'}</span>
                        {saved.isDefault ? ' (Default)' : ''} — {saved.addressLine1}, {saved.city} - {saved.postalCode}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-start gap-2.5 p-3 bg-[#FFF1E6] border border-[#F0D3B8] rounded-2xl text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="saved-address"
                      checked={selectedIndex === null}
                      onChange={chooseNewAddress}
                      className="mt-0.5 accent-[#FF5E1E]"
                    />
                    <span className="text-[#2A1A12]">Use a new address</span>
                  </label>
                </div>
              )}

              {/* Step 1: Contact */}
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
                      maxLength={150}
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
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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

              {/* Step 2: Shipping */}
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
                    maxLength={500}
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
                    maxLength={500}
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
                      inputMode="numeric"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-[#FFF1E6] border border-[#F0D3B8] rounded-full px-4 py-3 text-xs text-[#2A1A12] font-mono-tech focus:outline-none focus:border-[#FF5E1E]"
                    />
                  </div>
                </div>

                {selectedIndex === null && (
                  <label className="flex items-center gap-2 text-xs font-mono-tech text-[#8A6A54] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="accent-[#FF5E1E]"
                    />
                    <span>Save this address for next time</span>
                  </label>
                )}
                {addressNotice && (
                  <p className="text-[11px] text-[#8A6A54] font-mono-tech">{addressNotice}</p>
                )}
              </div>
              </>)}

              {/* Step 3: Payment */}
              <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs font-mono-tech uppercase tracking-wider text-[#2A1A12] font-bold pb-2 border-b border-[#F0D3B8]">
                  <span className="w-5 h-5 rounded-full bg-[#FF5E1E] text-white flex items-center justify-center text-[10px] font-mono-tech">
                    3
                  </span>
                  <span>Payment Method</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <span className="text-xs font-bold font-mono-tech text-[#2A1A12]">Razorpay Secure</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'razorpay' ? 'border-[#FF5E1E] bg-[#FF5E1E]' : 'border-[#E4C3A5]'
                        }`}
                      >
                        {paymentMethod === 'razorpay' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#8A6A54] font-light">
                      UPI (GPay / PhonePe / Paytm), Credit / Debit Cards, Netbanking.
                    </p>
                  </label>

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
                        <span className="text-xs font-bold font-mono-tech text-[#2A1A12]">Cash on Delivery</span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          paymentMethod === 'cod' ? 'border-[#FF5E1E] bg-[#FF5E1E]' : 'border-[#E4C3A5]'
                        }`}
                      >
                        {paymentMethod === 'cod' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#8A6A54] font-light">
                      Pay cash upon delivery to the express courier.
                    </p>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: summary */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-xl">
                <h3 className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold pb-3 border-b border-[#F0D3B8]">
                  Order Summary
                </h3>

                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3.5 items-center">
                      <div className="w-12 h-14 bg-[#FFF1E6] rounded-xl p-1.5 flex flex-col items-center justify-between text-[#2A1A12] shrink-0 border border-[#F0D3B8] shadow-inner overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <>
                            <div className="w-full flex justify-around">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
                              <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
                            </div>
                            <div className="text-[7px] font-mono-tech font-bold leading-none">IDIOT</div>
                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-600 border border-zinc-400" />
                          </>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#2A1A12] font-mono-tech truncate">{item.name}</div>
                        <div className="text-[11px] text-[#8A6A54]">
                          Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="text-xs font-bold font-mono-tech text-[#2A1A12]">
                        ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-4 border-t border-[#F0D3B8] text-xs font-mono-tech">
                  <div className="flex justify-between text-[#8A6A54]">
                    <span>Subtotal</span>
                    <span className="text-[#2A1A12]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="flex justify-between text-[#8A6A54]">
                    <span>Insured Express Shipping</span>
                    <span className="text-emerald-600 font-bold uppercase text-[11px]">Free</span>
                  </div>

                  <div className="flex justify-between text-base font-bold pt-3 border-t border-[#F0D3B8] text-[#2A1A12]">
                    <span>Estimated Total</span>
                    <span className="text-xl font-extrabold text-[#2A1A12]">
                      ₹{total.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#8A6A54] pt-1">
                    Final total is calculated by the server from the official catalogue at order time.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full flex items-center justify-center gap-2 shadow-xl shadow-[#FF5E1E]/30 glow-neon-orange transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>
                    {isProcessing
                      ? 'Connecting to Workbench...'
                      : paymentMethod === 'razorpay'
                        ? `Pay ₹${total.toLocaleString('en-IN')} via Razorpay`
                        : `Confirm Order (Cash on Delivery) — ₹${total.toLocaleString('en-IN')}`}
                  </span>
                  <ArrowRight size={14} />
                </button>

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
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
