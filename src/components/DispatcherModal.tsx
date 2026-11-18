import React, { useState } from 'react';
import { Order, DeliveryCity } from '../types/book';
import {
  X,
  Truck,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle,
  Plus,
  Filter,
  Landmark,
} from 'lucide-react';
import {
  updateOrderStatus,
  confirmBankTransferOrder,
  saveCities,
} from '../services/storage';

interface DispatcherModalProps {
  isOpen?: boolean;
  onClose: () => void;
  orders: Order[];
  onOrdersUpdated: (updated: Order[]) => void;
  deliveryCities: DeliveryCity[];
  onCitiesUpdated: (cities: DeliveryCity[]) => void;
}

export const DispatcherModal: React.FC<DispatcherModalProps> = ({
  onClose,
  orders,
  onOrdersUpdated,
  deliveryCities,
  onCitiesUpdated,
}) => {
  const pendingBankCount = orders.filter(
    (o) => o.paymentMethod === 'bank_transfer' && o.paymentStatus === 'pending'
  ).length;
  const [boardTab, setBoardTab] = useState<'payments' | 'dispatch'>(
    pendingBankCount > 0 ? 'payments' : 'dispatch'
  );
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Add City form state
  const [showAddCity, setShowAddCity] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityRegion, setNewCityRegion] = useState('');
  const [newCityFeeNGN, setNewCityFeeNGN] = useState(5000);
  const [newCityDays, setNewCityDays] = useState('2–3 days');

  // Filter only physical orders
  const physicalOrders = orders.filter((o) => o.destinationType === 'domestic' && o.deliveryCity);

  const filteredOrders = physicalOrders.filter((ord) => {
    if (selectedCityFilter !== 'all' && ord.deliveryCity !== selectedCityFilter) return false;
    if (selectedStatusFilter !== 'all' && ord.deliveryStatus !== selectedStatusFilter) return false;
    return true;
  });

  const handleConfirmBankPayment = async (orderId: string) => {
    const updated = await confirmBankTransferOrder(orderId);
    onOrdersUpdated(updated);
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['deliveryStatus']) => {
    const updated = await updateOrderStatus(orderId, newStatus);
    onOrdersUpdated(updated);
  };

  const handleNotesChange = async (orderId: string, notes: string) => {
    const updated = await updateOrderStatus(orderId, undefined, notes);
    onOrdersUpdated(updated);
  };

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;

    const newCity: DeliveryCity = {
      id: newCityName.toLowerCase().replace(/\s+/g, '-'),
      name: newCityName.trim(),
      stateOrRegion: newCityRegion.trim() || 'Nigeria',
      deliveryFeeUSD: Math.round(newCityFeeNGN / 1500),
      deliveryFeeNGN: newCityFeeNGN,
      estimatedDays: newCityDays,
    };

    const updated = [...deliveryCities, newCity];
    saveCities(updated);
    onCitiesUpdated(updated);
    setShowAddCity(false);
    setNewCityName('');
    setNewCityRegion('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-stone-900 text-white flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900 leading-tight">
                Orders, Bank Transfers &amp; Courier Dispatch
              </h2>
              <p className="text-xs text-stone-500">
                Verify direct bank transfers to unlock ebooks and manage hardcopy deliveries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-6 py-2.5 bg-white border-b border-stone-200 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setBoardTab('payments')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              boardTab === 'payments'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Orders &amp; Bank Transfers ({orders.length})</span>
            {pendingBankCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono text-[10px] font-bold">
                {pendingBankCount} pending
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setBoardTab('dispatch')}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              boardTab === 'dispatch'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>City Courier Dispatch ({physicalOrders.length})</span>
          </button>
        </div>

        {/* Toolbar: Filters & Add City Action (Dispatch Tab only) */}
        {boardTab === 'dispatch' && (
        <div className="p-4 bg-stone-100/70 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-stone-500 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter by:
            </span>
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              className="bg-white px-2.5 py-1.5 rounded border border-stone-300 text-stone-800"
            >
              <option value="all">All Cities ({physicalOrders.length})</option>
              {deliveryCities.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-white px-2.5 py-1.5 rounded border border-stone-300 text-stone-800"
            >
              <option value="all">All Statuses</option>
              <option value="preparing">Preparing Package</option>
              <option value="with_courier">With Courier Rider</option>
              <option value="delivered">Delivered to Customer</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddCity(!showAddCity)}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Delivery City</span>
          </button>
        </div>
        )}

        {/* Add City Drawer/Form */}
        {boardTab === 'dispatch' && showAddCity && (
          <form
            onSubmit={handleAddCity}
            className="p-4 bg-amber-50/70 border-b border-amber-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <div>
              <label className="text-amber-900 font-semibold block mb-1">City Name *</label>
              <input
                type="text"
                required
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="e.g. Benin City"
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded"
              />
            </div>
            <div>
              <label className="text-amber-900 font-semibold block mb-1">State / Region</label>
              <input
                type="text"
                value={newCityRegion}
                onChange={(e) => setNewCityRegion(e.target.value)}
                placeholder="e.g. Edo State"
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded"
              />
            </div>
            <div>
              <label className="text-amber-900 font-semibold block mb-1">Courier Fee (₦)</label>
              <input
                type="number"
                step="500"
                value={newCityFeeNGN}
                onChange={(e) => setNewCityFeeNGN(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded font-mono"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded"
              >
                Save City
              </button>
              <button
                type="button"
                onClick={() => setShowAddCity(false)}
                className="px-3 py-1.5 text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Orders List */}
        <div className="overflow-y-auto p-6 space-y-4 flex-1">
          {boardTab === 'payments' ? (
            orders.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <Landmark className="w-10 h-10 mx-auto text-stone-300" />
                <p className="font-serif text-base font-semibold text-stone-800">
                  No orders yet
                </p>
                <p className="text-xs text-stone-500">
                  When customers pay via Bank Transfer or Paystack, all orders appear here for tracking and confirmation.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 bg-white rounded-lg border border-stone-200 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900">#{order.id}</span>
                      <span className="text-stone-400">·</span>
                      <span className="text-stone-500">
                        {new Date(order.date).toLocaleString()}
                      </span>
                      <span className="text-stone-400">·</span>
                      <span className="font-mono font-bold text-stone-900">
                        ₦{order.totalNGN.toLocaleString()} (${order.totalUSD.toFixed(2)})
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                        order.paymentStatus === 'paid' || order.paymentStatus === 'free_granted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {order.paymentStatus === 'paid'
                        ? 'Confirmed Paid'
                        : order.paymentStatus === 'free_granted'
                        ? 'Free Grant'
                        : 'Pending Bank Transfer'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="font-semibold text-stone-900 block">
                        {order.customerName}
                      </span>
                      <span className="text-stone-500 block">{order.customerEmail}</span>
                      {order.customerPhone && (
                        <span className="font-mono text-stone-600 block">
                          {order.customerPhone}
                        </span>
                      )}
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded border border-stone-200 space-y-1">
                      <span className="text-stone-600 block">
                        Method:{' '}
                        <strong className="text-stone-900 uppercase">
                          {order.paymentMethod || 'paystack'}
                        </strong>
                      </span>
                      {order.bankTransferRef && (
                        <span className="text-stone-600 block">
                          Sender / Bank Ref:{' '}
                          <strong className="font-mono text-stone-900">
                            {order.bankTransferRef}
                          </strong>
                        </span>
                      )}
                      {order.paystackReference && (
                        <span className="text-stone-600 block">
                          Paystack Ref:{' '}
                          <strong className="font-mono text-stone-900">
                            {order.paystackReference}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {order.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="bg-stone-100 px-2 py-0.5 rounded text-stone-800 font-medium"
                        >
                          {item.quantity}x {item.book.title} ({item.format})
                        </span>
                      ))}
                    </div>

                    {order.paymentStatus === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleConfirmBankPayment(order.id)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirm Transfer Received &amp; Unlock Ebooks</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Truck className="w-10 h-10 mx-auto text-stone-300" />
              <p className="font-serif text-base font-semibold text-stone-800">
                No city deliveries found for this filter
              </p>
              <p className="text-xs text-stone-500">
                When customers place print edition orders with city delivery, they will appear here.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
              const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Hello ${order.customerName}, this is Open Shelf Books regarding your book delivery order #${order.id}.`
              )}`;

              return (
                <div
                  key={order.id}
                  className="p-5 bg-white rounded-lg border border-stone-200 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-900">
                        #{order.id}
                      </span>
                      <span className="text-stone-400">·</span>
                      <span className="text-xs text-stone-500">
                        {new Date(order.date).toLocaleDateString()}
                      </span>
                      <span className="text-stone-400">·</span>
                      <span className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-600" />
                        {order.deliveryCity}
                      </span>
                    </div>

                    {/* Status selector */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-stone-500 font-medium">Status:</span>
                      <select
                        value={order.deliveryStatus || 'preparing'}
                        onChange={(e) =>
                          handleStatusChange(order.id, e.target.value as Order['deliveryStatus'])
                        }
                        className={`px-2.5 py-1 rounded text-xs font-medium border ${
                          order.deliveryStatus === 'delivered'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                            : order.deliveryStatus === 'with_courier'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="preparing">Preparing / Packing</option>
                        <option value="with_courier">With Courier Rider</option>
                        <option value="delivered">Delivered to Recipient</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer Contact & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-semibold text-stone-900 block">{order.customerName}</span>
                      <div className="flex items-center gap-2 text-stone-600">
                        <span className="font-mono">{order.customerPhone}</span>
                        {order.customerPhone && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <a
                              href={`tel:${order.customerPhone}`}
                              className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                              title="Call customer"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      <span className="text-stone-500 block">{order.customerEmail}</span>
                    </div>

                    <div className="space-y-1 bg-stone-50 p-2.5 rounded border border-stone-200">
                      <span className="font-semibold text-stone-800 block">Street Address:</span>
                      <span className="text-stone-600 block">{order.deliveryAddress}</span>
                      {order.deliveryInstructions && (
                        <span className="text-[11px] text-stone-500 italic block mt-1">
                          Note: {order.deliveryInstructions}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Books in this shipment */}
                  <div className="text-xs pt-2 border-t border-stone-100 flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-stone-700">Titles:</span>
                    {order.items.map((item, idx) => (
                      <span
                        key={idx}
                        className="bg-stone-100 px-2 py-0.5 rounded text-stone-800 font-medium"
                      >
                        {item.quantity}x {item.book.title} ({item.format})
                      </span>
                    ))}
                  </div>

                  {/* Dispatcher Notes */}
                  <div className="pt-2">
                    <input
                      type="text"
                      defaultValue={order.dispatcherNotes || ''}
                      onBlur={(e) => handleNotesChange(order.id, e.target.value)}
                      placeholder="Add dispatcher note (e.g. Courier rider Suleiman dispatched with bike #3 at 11am)..."
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-700"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
