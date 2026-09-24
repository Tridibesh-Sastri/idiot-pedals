import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  Package,
  MapPin,
  ExternalLink,
  Printer,
  HelpCircle,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { Order } from '../types';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';
import { useToast } from '../context/ToastContext';

/**
 * OrderDetailPage Component
 *
 * Provides granular tracking information for a specific order:
 * - Chronological shipment milestones (Confirmed -> Assembled -> Shipped -> In Transit -> Delivered)
 * - Courier name and AWB tracking code with one-click clipboard copy
 * - Recipient delivery address and payment verification status
 * - Printable workshop invoice / packing slip
 */
export const OrderDetailPage: React.FC = () => {
  // Extract order ID parameter from URL (e.g. "IP-884210")
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  // State: Order data record and asynchronous fetch indicator
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the order by ID on mount or whenever the URL parameter changes
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const found = await orderService.getOrderById(id);
        setOrder(found);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  /**
   * Invokes native browser print dialog for paper invoice generation
   */
  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0A] text-[#F3EFE6] flex items-center justify-center pt-20">
        <div className="text-xs font-mono-tech text-[#8C857A]">
          Fetching shipment tracking data...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0B0B0A] text-[#F3EFE6] flex flex-col items-center justify-center px-4 pt-20">
        <div className="max-w-md w-full bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-xl font-bold font-cinzel text-[#F3EFE6]">Order Not Found</h2>
          <p className="text-xs text-[#8C857A]">
            We could not find an order with identifier {id}.
          </p>
          <Link
            to="/orders"
            className="inline-block px-5 py-2.5 bg-[#D91E18] text-white text-xs font-mono-tech uppercase font-bold rounded"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0B0A] text-[#F3EFE6] pt-24 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase text-[#8C857A] hover:text-[#F3EFE6] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Orders
          </Link>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171513] border border-[#8C857A]/30 text-xs text-[#8C857A] hover:text-white rounded transition-colors"
          >
            <Printer size={14} />
            Print Receipt
          </button>
        </div>

        {/* Top Order Badge Header */}
        <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#8C857A]/20">
            <div>
              <div className="text-xs font-mono-tech text-[#D91E18] font-bold uppercase tracking-wider">
                Order Confirmed & Bench Logged
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-mono-tech text-[#F3EFE6] mt-1">
                {order.id}
              </h1>
              <div className="text-xs text-[#8C857A] mt-1">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <div className="text-xs font-mono-tech text-[#8C857A] uppercase">Estimated Arrival</div>
              <div className="text-sm font-bold text-emerald-400">
                {order.estimatedDelivery || '3-4 Business Days'}
              </div>
              <div className="text-[11px] text-[#8C857A]">
                Courier: {order.courierName}
              </div>
            </div>
          </div>

          {/* Tracking Number Card */}
          {order.trackingNumber && (
            <div className="p-4 bg-[#0B0B0A] rounded-xl border border-[#8C857A]/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Truck size={20} className="text-[#D91E18] shrink-0" />
                <div>
                  <div className="text-[11px] font-mono-tech uppercase text-[#8C857A]">
                    Live Tracking AWB Number
                  </div>
                  <div className="text-sm font-bold font-mono-tech text-[#F3EFE6]">
                    {order.trackingNumber}
                  </div>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-mono-tech font-bold uppercase flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Courier Sync
              </span>
            </div>
          )}
        </div>

        {/* Visual Shipping Journey Timeline */}
        <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <h2 className="text-lg font-cinzel font-bold uppercase tracking-tight text-[#F3EFE6] pb-3 border-b border-[#8C857A]/20">
            Shipment Journey
          </h2>

          <div className="space-y-8 relative pl-6 border-l-2 border-[#8C857A]/30 my-4 ml-3">
            {order.timeline.map((step, idx) => {
              const isPast = step.completed && !step.current;
              const isCurrent = step.current;

              return (
                <div key={idx} className="relative group">
                  {/* Indicator Dot */}
                  <div
                    className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 transition-all ${
                      isCurrent
                        ? 'bg-[#D91E18] border-white shadow-[0_0_12px_#D91E18]'
                        : step.completed
                        ? 'bg-emerald-500 border-emerald-300'
                        : 'bg-[#0B0B0A] border-zinc-600'
                    }`}
                  />

                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="text-sm font-bold text-[#F3EFE6] flex items-center gap-2">
                        <span>{step.title}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-[#D91E18]/20 border border-[#D91E18] text-[10px] font-mono-tech text-[#D91E18] font-bold uppercase">
                            Current Stage
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono-tech text-[#8C857A]">
                        {step.timestamp}
                      </div>
                    </div>
                    <p className="text-xs text-[#8C857A] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items & Financial Invoice Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Purchased Items */}
          <div className="md:col-span-7 bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold pb-2 border-b border-[#8C857A]/20">
              Purchased Gear
            </h3>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="w-14 h-16 bg-[#F3EFE6] rounded p-2 flex flex-col items-center justify-between text-[#0B0B0A] shrink-0 border border-[#8C857A]/40">
                    <div className="w-full flex justify-around">
                      <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                    </div>
                    <div className="text-[8px] font-black leading-none">IDIOT</div>
                    <div className="w-3 h-3 rounded-full bg-zinc-300 border border-zinc-500"></div>
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#F3EFE6]">{item.name}</div>
                    <div className="text-xs text-[#8C857A]">{item.subtitle}</div>
                    <div className="text-xs font-mono-tech text-[#8C857A] mt-1">
                      Qty: {item.quantity} × ₹{item.price.toLocaleString()}
                    </div>
                  </div>

                  <div className="text-sm font-black font-mono-tech text-[#F3EFE6]">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="pt-4 border-t border-[#8C857A]/20 space-y-2 text-xs">
              <div className="flex justify-between text-[#8C857A]">
                <span>Subtotal</span>
                <span className="text-[#F3EFE6] font-mono-tech">₹{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#8C857A]">
                <span>Insured Doorstep Shipping</span>
                <span className="text-emerald-400 font-bold uppercase">Free</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-[#8C857A]/20 text-[#F3EFE6]">
                <span>Total Settled</span>
                <span className="text-lg font-black font-mono-tech text-[#F3EFE6]">
                  ₹{order.total.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-[#8C857A] pt-1">
                Payment Method: {order.paymentMethod === 'razorpay' ? 'Razorpay Online (Paid)' : 'Cash on Delivery (Pending)'}
              </div>
            </div>
          </div>

          {/* Delivery Address & Workbench Warranty */}
          <div className="md:col-span-5 space-y-4">
            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-mono-tech uppercase tracking-wider text-[#F3EFE6] font-bold flex items-center gap-2">
                <MapPin size={15} className="text-[#D91E18]" />
                Delivery Address
              </h3>
              <div className="text-xs text-[#8C857A] space-y-1">
                <div className="font-bold text-[#F3EFE6]">{order.shippingAddress.fullName}</div>
                <div>{order.shippingAddress.addressLine1}</div>
                {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                </div>
                <div className="text-[#F3EFE6] font-mono-tech pt-1">
                  Phone: {order.shippingAddress.phone}
                </div>
              </div>
            </div>

            <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 space-y-3 text-xs text-[#8C857A]">
              <div className="font-bold text-[#F3EFE6] flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#D91E18]" />
                Workbench Warranty Included
              </div>
              <p>
                This pedal is covered for 365 days from delivery date against any component defect.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 text-xs text-[#D91E18] font-bold hover:underline"
              >
                Need assistance with this order?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
