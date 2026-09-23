import React, { useState } from 'react';
import { BusinessSettings, Receipt } from '../types';
import { formatCurrency, formatDate, openWhatsAppChat, generateWhatsAppReceiptText } from '../utils/whatsapp';
import {
  Search,
  Receipt as ReceiptIcon,
  MessageSquare,
  Eye,
  Calendar,
  User,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

interface ReceiptsListProps {
  receipts: Receipt[];
  settings: BusinessSettings;
  onSelectReceipt: (receipt: Receipt) => void;
}

export const ReceiptsList: React.FC<ReceiptsListProps> = ({
  receipts,
  settings,
  onSelectReceipt,
}) => {
  const currency = settings.currency || 'C$';
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'credit_sale' | 'payment'>('all');

  const filtered = receipts
    .filter((r) => {
      const matchSearch =
        r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        r.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.customerPhone.includes(search);
      const matchType = filterType === 'all' || r.type === filterType;
      return matchSearch && matchType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, no. recibo o teléfono..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Todos ({receipts.length})
          </button>
          <button
            onClick={() => setFilterType('credit_sale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterType === 'credit_sale'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Ventas Crédito
          </button>
          <button
            onClick={() => setFilterType('payment')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterType === 'payment'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Abonos
          </button>
        </div>
      </div>

      {/* Receipts list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 text-slate-400 text-xs">
          <ReceiptIcon className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-semibold text-slate-600 text-sm">No se encontraron recibos</p>
          <p className="mt-1">Emite una nueva venta o registra un abono para generar recibos digitales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((receipt) => {
            const isPayment = receipt.type === 'payment';
            return (
              <div
                key={receipt.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 transition-all shadow-xs hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 font-mono-receipt">
                          {receipt.receiptNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isPayment
                              ? 'bg-teal-50 text-teal-700 border border-teal-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isPayment ? 'Comprobante Abono' : 'Factura Crédito'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {receipt.customerName}
                      </h4>
                    </div>

                    <div className="text-right font-mono-receipt">
                      <span className="text-sm font-extrabold text-slate-900 block">
                        {isPayment
                          ? formatCurrency(receipt.amountPaidNow, currency)
                          : formatCurrency(receipt.subtotal, currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isPayment ? 'Abonado' : 'Total compra'}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  {!isPayment && receipt.items && receipt.items.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 mb-3 space-y-1 font-mono-receipt">
                      {receipt.items.slice(0, 3).map((it, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="truncate max-w-[190px]">
                            {it.quantity} {it.unit} {it.product}
                          </span>
                          <span className="font-semibold">{formatCurrency(it.totalPrice, currency)}</span>
                        </div>
                      ))}
                      {receipt.items.length > 3 && (
                        <div className="text-[10px] text-slate-400 italic">
                          + {receipt.items.length - 3} producto(s) más...
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2 font-mono-receipt">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-300" />
                      {formatDate(receipt.date)}
                    </span>
                    <span className="font-semibold text-rose-600">
                      Saldo restante: {formatCurrency(receipt.newBalance, currency)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      const text = generateWhatsAppReceiptText(receipt, settings);
                      openWhatsAppChat(receipt.customerPhone, text);
                    }}
                    className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                    title="Reenviar a WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => onSelectReceipt(receipt)}
                    className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Recibo Digital</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
