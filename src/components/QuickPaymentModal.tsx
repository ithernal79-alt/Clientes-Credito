import React, { useState } from 'react';
import { BusinessSettings, Customer, PaymentRecord, Receipt } from '../types';
import { formatCurrency } from '../utils/whatsapp';
import { DollarSign, X, Check, ArrowRight, User, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuickPaymentModalProps {
  customers: Customer[];
  settings: BusinessSettings;
  preselectedCustomerId?: string;
  onSavePayment: (receipt: Receipt, updatedCustomerBalance: number, paymentRecord: PaymentRecord) => void;
  onClose: () => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  customers,
  settings,
  preselectedCustomerId,
  onSavePayment,
  onClose,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomerId || (customers.length > 0 ? customers[0].id : '')
  );

  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'otro'>('efectivo');
  const [notes, setNotes] = useState('Abono a cuenta');

  const currency = settings.currency || 'C$';
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const prevBalance = selectedCustomer ? selectedCustomer.currentBalance : 0;
  const payAmount = parseFloat(amount) || 0;
  const newBalance = Math.max(0, prevBalance - payAmount);

  const handleFullPayShortcut = () => {
    setAmount(prevBalance.toString());
  };

  const handleAmountPreset = (val: number) => {
    setAmount(val.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Selecciona un cliente');
      return;
    }

    if (payAmount <= 0) {
      alert('Ingresa un monto válido para el abono.');
      return;
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-5)}`;
    const nowIso = new Date().toISOString();

    const paymentReceipt: Receipt = {
      id: 'rec_pay_' + Math.random().toString(36).substring(2, 9),
      receiptNumber,
      type: 'payment',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      date: nowIso,
      items: [],
      subtotal: 0,
      previousBalance: prevBalance,
      amountPaidNow: payAmount,
      newBalance: newBalance,
      paymentMethod: paymentMethod,
      notes: notes || 'Abono realizado a la cuenta',
      createdAt: nowIso,
    };

    const paymentRecord: PaymentRecord = {
      id: 'pay_' + Math.random().toString(36).substring(2, 9),
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: payAmount,
      date: nowIso,
      paymentMethod: paymentMethod,
      previousBalance: prevBalance,
      newBalance: newBalance,
      notes: notes,
      receiptNumber,
    };

    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    onSavePayment(paymentReceipt, newBalance, paymentRecord);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full my-auto overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-emerald-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Registrar Abono</h2>
              <p className="text-xs text-teal-100">
                Se descuenta del saldo y genera comprobante digital
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Customer select */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              Cliente:
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — Debe: {formatCurrency(c.currentBalance, currency)}
                </option>
              ))}
            </select>
          </div>

          {/* Current Debt Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 font-mono-receipt text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-500 font-sans block text-[11px]">Saldo Pendiente Actual:</span>
              <span className="text-base font-bold text-rose-600">
                {formatCurrency(prevBalance, currency)}
              </span>
            </div>
            {prevBalance > 0 && (
              <button
                type="button"
                onClick={handleFullPayShortcut}
                className="text-[11px] font-sans font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl transition"
              >
                Pagar Todo
              </button>
            )}
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Monto a Abonar ({currency}):
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                {currency}
              </span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-2xl text-xl font-bold font-mono-receipt text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
              />
            </div>

            {/* Shortcut amount pills */}
            <div className="flex gap-2 mt-2">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleAmountPreset(preset)}
                  className="flex-1 py-1 text-xs bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg font-mono-receipt font-semibold transition"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Método de Pago:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
                { id: 'transferencia', label: 'Transferencia', icon: CreditCard },
                { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border flex flex-col items-center gap-1 transition ${
                    paymentMethod === m.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nota o Referencia:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Abono por banco Lafise, entregó en mostrador..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 outline-none"
            />
          </div>

          {/* New Balance Result Preview */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center font-mono-receipt">
            <div>
              <span className="text-[10px] uppercase font-sans font-bold text-emerald-800 block">
                NUEVO SALDO TRAS EL ABONO:
              </span>
              <span className="text-xs font-sans text-emerald-600">
                {newBalance === 0 ? '¡Deuda totalmente cancelada!' : 'Saldo restante a pagar'}
              </span>
            </div>
            <span className="text-lg font-extrabold text-emerald-900">
              {formatCurrency(newBalance, currency)}
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={payAmount <= 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition"
            >
              <Check className="w-4 h-4" />
              <span>Registrar y Ver Recibo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
