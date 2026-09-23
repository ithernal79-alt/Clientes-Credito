import React, { useState } from 'react';
import { Customer, BusinessSettings } from '../types';
import { formatCurrency, formatDate, openWhatsAppChat } from '../utils/whatsapp';
import {
  Search,
  UserPlus,
  Phone,
  DollarSign,
  PlusCircle,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Clock,
} from 'lucide-react';

interface CustomerCardListProps {
  customers: Customer[];
  settings: BusinessSettings;
  onSelectCustomer: (customer: Customer) => void;
  onOpenVoiceInvoiceForCustomer: (customerId: string) => void;
  onOpenPaymentForCustomer: (customerId: string) => void;
  onAddNewCustomer: () => void;
}

export const CustomerCardList: React.FC<CustomerCardListProps> = ({
  customers,
  settings,
  onSelectCustomer,
  onOpenVoiceInvoiceForCustomer,
  onOpenPaymentForCustomer,
  onAddNewCustomer,
}) => {
  const currency = settings.currency || 'C$';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with_debt' | 'paid_up'>('all');

  const filtered = customers
    .filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        c.address.toLowerCase().includes(search.toLowerCase());
      if (filter === 'with_debt') return matchSearch && c.currentBalance > 0;
      if (filter === 'paid_up') return matchSearch && c.currentBalance <= 0;
      return matchSearch;
    })
    .sort((a, b) => b.currentBalance - a.currentBalance);

  const totalDebtOverall = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const customersWithDebt = customers.filter((c) => c.currentBalance > 0).length;

  return (
    <div className="space-y-4">
      {/* Search and Add Header */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, teléfono o dirección..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
          />
        </div>

        <button
          onClick={onAddNewCustomer}
          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos ({customers.length})
        </button>
        <button
          onClick={() => setFilter('with_debt')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
            filter === 'with_debt'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          <span>Con Saldo Pendiente ({customersWithDebt})</span>
        </button>
        <button
          onClick={() => setFilter('paid_up')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
            filter === 'paid_up'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
          }`}
        >
          <span>Al Día ({customers.length - customersWithDebt})</span>
        </button>
      </div>

      {/* Customers Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
          <p className="font-semibold text-slate-600 text-sm">No se encontraron clientes</p>
          <p className="mt-1">Prueba con otro término de búsqueda o registra un nuevo cliente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((customer) => {
            const hasDebt = customer.currentBalance > 0;
            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Top: Name & Balance Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => onSelectCustomer(customer)}
                      className="cursor-pointer group flex-1"
                    >
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition flex items-center gap-1.5">
                        <span>{customer.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                      </h3>
                      {customer.address && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {customer.address}
                        </p>
                      )}
                    </div>

                    {/* Balance display */}
                    <div className="text-right font-mono-receipt shrink-0">
                      <span
                        className={`text-base font-extrabold block ${
                          hasDebt ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(customer.currentBalance, currency)}
                      </span>
                      <span className="text-[10px] uppercase font-sans font-semibold text-slate-400">
                        {hasDebt ? 'Saldo Pendiente' : 'Al Día'}
                      </span>
                    </div>
                  </div>

                  {/* Meta: Phone, Last payment */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono-receipt">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {customer.phone}
                      </span>
                    </div>

                    {customer.nextPaymentDueDate && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-amber-500" />
                        Vence: {formatDate(customer.nextPaymentDueDate).split(',')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      const greeting = `¡Hola ${customer.name}! 🏪 Le saludamos de ${settings.businessName}. Su saldo pendiente actual es de ${currency} ${customer.currentBalance}. ¡Agradecemos su preferencia!`;
                      openWhatsAppChat(customer.phone, greeting);
                    }}
                    className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition"
                    title="Abrir WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenPaymentForCustomer(customer.id)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Abonar</span>
                    </button>

                    <button
                      onClick={() => onOpenVoiceInvoiceForCustomer(customer.id)}
                      className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Venta Voz</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
