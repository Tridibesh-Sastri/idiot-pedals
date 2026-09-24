import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Truck } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';

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
        return <span className="px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 text-xs font-mono-tech uppercase">Confirmed</span>;
      case 'processing':
        return <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 text-xs font-mono-tech uppercase">Bench Assembly</span>;
      case 'shipped':
      case 'in_transit':
        return <span className="px-3 py-1 rounded-full bg-[#FF5E1E]/20 border border-[#FF5E1E]/40 text-[#FF5E1E] text-xs font-mono-tech uppercase">In Transit</span>;
      case 'out_for_delivery':
        return <span className="px-3 py-1 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-xs font-mono-tech uppercase">Out for Delivery</span>;
      case 'delivered':
        return <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-mono-tech uppercase">Delivered</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-mono-tech uppercase">{status}</span>;
    }
  };

  return (
    <div className="bg-[#0B0E14] text-[#F6F4EE] pt-28 pb-20 min-h-screen relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-[#FF5E1E]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        
        {/* Header */}
        <div className="border-b border-white/10 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-editorial font-normal uppercase text-[#F6F4EE]">
              Your Pedal Orders
            </h1>
            <p className="text-xs text-[#8E98A8] font-mono-tech">
              Track live shipment progress, bench calibration certificates, and delivery updates.
            </p>
          </div>
          <Link
            to="/product"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] hover:from-[#FF8A00] hover:to-[#FF5500] text-white text-xs font-mono-tech font-bold uppercase rounded-full self-start sm:self-auto shadow-lg shadow-[#FF5E1E]/25 transition-all glow-neon-subtle"
          >
            <span>Order New Pedal</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Orders Listing */}
        {loading ? (
          <div className="text-center py-20 text-xs font-mono-tech text-[#8E98A8]">
            Loading workbench shipments...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#121722]/80 border border-white/10 rounded-3xl p-12 text-center space-y-4 backdrop-blur-xl">
            <Package size={36} className="text-[#8E98A8] mx-auto" />
            <h3 className="text-2xl font-editorial font-bold text-[#F6F4EE]">No Orders Found</h3>
            <p className="text-xs text-[#8E98A8] font-mono-tech max-w-sm mx-auto">
              You haven't ordered any gear from the IDIOT Pedals workbench yet.
            </p>
            <Link
              to="/product"
              className="inline-block px-7 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-white text-xs font-mono-tech font-bold uppercase rounded-full shadow-lg shadow-[#FF5E1E]/25"
            >
              Get Neon Fuzz Box — ₹2,499
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-[#121722]/80 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl hover:border-[#FF5E1E]/40 transition-all space-y-4 backdrop-blur-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-extrabold font-mono-tech text-[#F6F4EE]">
                        {order.id}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-xs text-[#8E98A8] font-mono-tech mt-1">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })} • Payment: {order.paymentMethod.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-left sm:text-right font-mono-tech">
                    <div className="text-lg font-bold text-[#F6F4EE]">
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
                        <span className="font-bold text-[#F6F4EE] font-mono-tech">{item.name}</span>
                        <span className="text-[#8E98A8] font-mono-tech">
                          (Qty: {item.quantity})
                        </span>
                      </div>
                    ))}
                    {order.trackingNumber && (
                      <div className="text-xs text-[#8E98A8] flex items-center gap-1.5 pt-1 font-mono-tech">
                        <Truck size={14} className="text-[#FF5E1E]" />
                        <span>
                          {order.courierName} • Tracking: <span className="text-[#F6F4EE] font-bold">{order.trackingNumber}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/orders/${order.id}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0B0E14] hover:bg-[#161C28] border border-white/15 text-xs font-mono-tech font-bold uppercase rounded-full text-[#F6F4EE] hover:border-[#FF5E1E] transition-all"
                  >
                    <span>View Tracking</span>
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
