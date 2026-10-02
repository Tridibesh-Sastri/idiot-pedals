import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Truck, ShieldCheck, MapPin, Printer, AlertTriangle, Package } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { ErrorState, LoadingState } from '../components/common/AsyncState';

const STATUS_HEADLINE: Record<Order['status'], string> = {
  pending: 'Order Placed — Awaiting Confirmation',
  confirmed: 'Order Confirmed & Bench Logged',
  processing: 'Bench Assembly In Progress',
  shipped: 'Shipped From The Workbench',
  in_transit: 'In Transit To You',
  out_for_delivery: 'Out For Delivery',
  delivered: 'Delivered',
  cancelled: 'Order Cancelled',
  returned: 'Order Returned',
  refunded: 'Order Refunded',
};

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, initializing } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setOrder(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const found = await orderService.getOrderById(id);
      setOrder(found);
    } catch (err) {
      setError(err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (initializing) return;
    if (!isAuthenticated) {
      setLoading(false);
      setOrder(null);
      return;
    }
    load();
  }, [initializing, isAuthenticated, load]);

  const handlePrint = () => {
    window.print();
  };

  /* ---------------------------------------------------------------------- */
  /* Guards                                                                  */
  /* ---------------------------------------------------------------------- */

  if (initializing || loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <LoadingState message="Fetching shipment tracking data…" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] bg-[#FFF8F1] text-[#2A1A12] flex flex-col items-center justify-center px-4 pt-28">
        <div className="max-w-md w-full bg-white border border-[#F0D3B8] rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <Package size={32} className="text-[#FF5E1E] mx-auto" />
          <h2 className="text-2xl font-editorial font-bold text-[#2A1A12]">Sign In To Track This Order</h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            Order tracking is only available to the account that placed the order.
          </p>
          <Link
            to="/login"
            state={{ from: `/orders/${id ?? ''}` }}
            className="inline-block px-8 py-3.5 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <ErrorState error={error} message="We could not load this order right now." onRetry={load} />
          <div className="text-center">
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase text-[#8A6A54] hover:text-[#2A1A12]"
            >
              <ArrowLeft size={14} />
              <span>Back to Orders</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FFF8F1] text-[#2A1A12] flex flex-col items-center justify-center px-4 pt-20">
        <div className="max-w-md w-full bg-white border border-[#F0D3B8] rounded-3xl p-8 text-center space-y-4 backdrop-blur-xl">
          <h2 className="text-2xl font-editorial font-bold text-[#2A1A12]">Order Not Found</h2>
          <p className="text-xs text-[#8A6A54] font-mono-tech">
            We could not find an order with identifier &quot;
            {id ? String(id).slice(0, 32).replace(/[^a-zA-Z0-9_-]/g, '') : 'unknown'}&quot;.
          </p>
          <Link
            to="/orders"
            className="inline-block px-6 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech uppercase font-bold rounded-full"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const paymentPending = order.paymentMethod === 'razorpay' && order.paymentStatus !== 'paid';

  return (
    <div className="bg-[#FFF8F1] text-[#2A1A12] pt-28 pb-20 min-h-screen relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-[#FF5E1E]/10 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">

        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase text-[#8A6A54] hover:text-[#2A1A12] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Orders</span>
          </Link>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FFF1E6] border border-[#F0D3B8] text-xs font-mono-tech text-[#8A6A54] hover:text-[#2A1A12] hover:border-[#FF5E1E] rounded-full transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>Print Receipt</span>
          </button>
        </div>

        {/* Pending payment notice */}
        {paymentPending && (
          <div className="p-4 bg-amber-50 border border-amber-500/40 rounded-2xl text-xs font-mono-tech text-[#2A1A12] flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            <span>
              Payment for this order is still <span className="font-bold">{order.paymentStatus}</span>. If you
              completed payment, it is being confirmed server-side and will update here shortly.
            </span>
          </div>
        )}

        {/* Top Order Badge Header */}
        <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F0D3B8]">
            <div>
              <div className="text-xs font-mono-tech text-[#FF5E1E] font-bold uppercase tracking-wider">
                {STATUS_HEADLINE[order.status] ?? 'Order Status'}
              </div>
              <h1 className="text-3xl font-extrabold font-mono-tech text-[#2A1A12] mt-1">{order.id}</h1>
              <div className="text-xs text-[#8A6A54] font-mono-tech mt-1">
                Placed on{' '}
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'}
              </div>
            </div>

            <div className="sm:text-right space-y-1 font-mono-tech">
              <div className="text-xs text-[#8A6A54] uppercase">Estimated Arrival</div>
              <div className="text-sm font-bold text-emerald-600">
                {order.estimatedDelivery || '3-4 Business Days'}
              </div>
              <div className="text-[11px] text-[#8A6A54]">Courier: {order.courierName || 'Assigned at dispatch'}</div>
            </div>
          </div>

          {/* Tracking Number Card */}
          {order.trackingNumber && (
            <div className="p-4 bg-[#FFF1E6] rounded-2xl border border-[#F0D3B8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono-tech">
              <div className="flex items-center gap-3">
                <Truck size={20} className="text-[#FF5E1E] shrink-0" />
                <div>
                  <div className="text-[11px] uppercase text-[#8A6A54]">Live Tracking AWB Number</div>
                  <div className="text-sm font-bold text-[#2A1A12]">{order.trackingNumber}</div>
                </div>
              </div>
              <span className="text-xs text-emerald-600 font-bold uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Courier Sync
              </span>
            </div>
          )}
        </div>

        {/* Visual Shipping Journey Timeline */}
        <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 backdrop-blur-xl">
          <h2 className="text-xl font-editorial font-bold uppercase tracking-tight text-[#2A1A12] pb-3 border-b border-[#F0D3B8]">
            Shipment Journey
          </h2>

          <div className="space-y-8 relative pl-6 border-l-2 border-[#F0D3B8] my-4 ml-3">
            {order.timeline.map((step, idx) => {
              const isCurrent = step.current;

              return (
                <div key={idx} className="relative group">
                  {/* Indicator Dot */}
                  <div
                    className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 transition-all ${
                      isCurrent
                        ? 'bg-[#FF5E1E] border-white shadow-[0_0_12px_#FF5E1E]'
                        : step.completed
                          ? 'bg-emerald-500 border-emerald-300'
                          : 'bg-[#FFF1E6] border-[#E4C3A5]'
                    }`}
                  />

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="text-sm font-bold text-[#2A1A12] flex items-center gap-2 font-mono-tech">
                        <span>{step.title}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FF5E1E]/20 border border-[#FF5E1E]/40 text-[10px] text-[#FF5E1E] font-bold uppercase">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono-tech text-[#8A6A54]">{step.timestamp}</div>
                    </div>
                    <p className="text-xs text-[#8A6A54] leading-relaxed font-light">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items & Financial Invoice Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Purchased Items */}
          <div className="md:col-span-7 bg-white border border-[#F0D3B8] rounded-3xl p-6 sm:p-7 space-y-4 backdrop-blur-xl">
            <h3 className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold pb-2 border-b border-[#F0D3B8]">
              Purchased Gear
            </h3>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={`${order.id}-${item.id}`} className="flex gap-4 items-center">
                  <div className="w-14 h-16 bg-[#FFF1E6] rounded-xl p-2 flex flex-col items-center justify-between text-[#2A1A12] shrink-0 border border-[#F0D3B8] shadow-inner">
                    <div className="w-full flex justify-around">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A00]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5E1E]" />
                    </div>
                    <div className="text-[8px] font-mono-tech font-bold leading-none">IDIOT</div>
                    <div className="w-3 h-3 rounded-full bg-[#B08968] border border-[#8A6A54]" />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-bold font-mono-tech text-[#2A1A12]">{item.name}</div>
                    <div className="text-xs text-[#8A6A54]">{item.subtitle}</div>
                    <div className="text-xs font-mono-tech text-[#8A6A54] mt-1">
                      Qty: {item.quantity} × ₹{item.price.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="text-sm font-bold font-mono-tech text-[#2A1A12]">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="pt-4 border-t border-[#F0D3B8] space-y-2 text-xs font-mono-tech">
              <div className="flex justify-between text-[#8A6A54]">
                <span>Subtotal</span>
                <span className="text-[#2A1A12]">₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#8A6A54]">
                <span>Insured Doorstep Shipping</span>
                <span className="text-emerald-600 font-bold uppercase">
                  {order.shippingFee > 0 ? `₹${order.shippingFee.toLocaleString('en-IN')}` : 'Free'}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-[#F0D3B8] text-[#2A1A12]">
                <span>Total Settled</span>
                <span className="text-lg font-bold text-[#2A1A12]">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-[11px] text-[#8A6A54] pt-1">
                Payment Method:{' '}
                {order.paymentMethod === 'razorpay'
                  ? `Razorpay Online (${order.paymentStatus})`
                  : 'Cash on Delivery (Pending)'}
              </div>
            </div>
          </div>

          {/* Delivery Address & Workbench Warranty */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 space-y-3 backdrop-blur-xl">
              <h3 className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#2A1A12] font-bold flex items-center gap-2">
                <MapPin size={15} className="text-[#FF5E1E]" />
                Delivery Address
              </h3>
              <div className="text-xs font-mono-tech text-[#8A6A54] space-y-1">
                <div className="font-bold text-[#2A1A12]">{order.shippingAddress.fullName}</div>
                <div>{order.shippingAddress.addressLine1}</div>
                {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                </div>
                <div>{order.shippingAddress.country}</div>
                <div className="text-[#2A1A12] pt-1">Phone: {order.shippingAddress.phone}</div>
              </div>
            </div>

            <div className="bg-white border border-[#F0D3B8] rounded-3xl p-6 space-y-3 text-xs font-mono-tech text-[#8A6A54] backdrop-blur-xl">
              <div className="font-bold text-[#2A1A12] flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#FF5E1E]" />
                Workbench Warranty Included
              </div>
              <p className="font-light">
                This pedal is covered for 365 days from delivery date against any component defect.
              </p>
              <Link to="/contact" className="inline-flex items-center gap-1.5 text-xs text-[#FF5E1E] font-bold hover:underline">
                Need assistance with this order?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
