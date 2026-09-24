import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Clock, ShieldCheck, Truck } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { IdiotPedalsLogo } from '../components/common/IdiotPedalsLogo';

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getOrders(user?.id);
        setOrders(data);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-1 rounded bg-sky-950/80 border border-sky-800 text-sky-400 text-xs font-mono-tech uppercase">Confirmed</span>;
      case 'processing':
        return <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-amber-400 text-xs font-mono-tech uppercase">Bench Assembly</span>;
      case 'shipped':
      case 'in_transit':
        return <span className="px-2.5 py-1 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-xs font-mono-tech uppercase">In Transit</span>;
      case 'out_for_delivery':
        return <span className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-mono-tech uppercase">Out for Delivery</span>;
      case 'delivered':
        return <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono-tech uppercase">Delivered</span>;
      default:
        return <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-400 text-xs font-mono-tech uppercase">{status}</span>;
    }
  };

  return (
    <div className="bg-[#0B0B0A] text-[#F3EFE6] pt-24 pb-20 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-[#8C857A]/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-cinzel font-black uppercase text-[#F3EFE6]">
              Your Pedal Orders
            </h1>
            <p className="text-xs text-[#8C857A]">
              Track live shipment progress, bench calibration certificates, and delivery updates.
            </p>
          </div>
          <Link
            to="/product"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#D91E18] text-white text-xs font-mono-tech font-bold uppercase rounded self-start sm:self-auto hover:bg-[#b51712]"
          >
            Order New Pedal
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Orders Listing */}
        {loading ? (
          <div className="text-center py-20 text-xs font-mono-tech text-[#8C857A]">
            Loading workbench shipments...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-12 text-center space-y-4">
            <Package size={36} className="text-[#8C857A] mx-auto" />
            <h3 className="text-lg font-bold text-[#F3EFE6]">No Orders Found</h3>
            <p className="text-xs text-[#8C857A] max-w-sm mx-auto">
              You haven't ordered any gear from the IDIOT Pedals workbench yet.
            </p>
            <Link
              to="/product"
              className="inline-block px-6 py-2.5 bg-[#D91E18] text-white text-xs font-mono-tech font-bold uppercase rounded"
            >
              Get Neon Fuzz Box — ₹2,499
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-[#171513] border border-[#8C857A]/25 rounded-2xl p-6 shadow-xl hover:border-[#8C857A]/50 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#8C857A]/20 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black font-mono-tech text-[#F3EFE6]">
                        {order.id}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-[#8C857A] mt-1">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })} • Payment: {order.paymentMethod.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-base font-black font-mono-tech text-[#F3EFE6]">
                      ₹{order.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-emerald-400">Free Express Delivery</div>
                  </div>
                </div>

                {/* Items preview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 text-xs">
                        <span className="font-bold text-[#F3EFE6]">{item.name}</span>
                        <span className="text-[#8C857A] font-mono-tech">
                          (Qty: {item.quantity})
                        </span>
                      </div>
                    ))}
                    {order.trackingNumber && (
                      <div className="text-xs text-[#8C857A] flex items-center gap-1.5 pt-1">
                        <Truck size={14} className="text-[#D91E18]" />
                        <span>
                          {order.courierName} • Tracking: <span className="font-mono-tech text-[#F3EFE6] font-bold">{order.trackingNumber}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B0B0A] hover:bg-[#171513] border border-[#8C857A]/30 text-xs font-mono-tech font-bold uppercase rounded text-[#F3EFE6] hover:border-[#D91E18] transition-colors"
                  >
                    View Shipment Tracking
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
