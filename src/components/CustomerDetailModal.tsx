import React, { useState } from 'react';
import { Customer, BusinessSettings, Receipt, PaymentRecord } from '../types';
import { formatCurrency, formatDate, openWhatsAppChat } from '../utils/whatsapp';
import {
  X,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  PlusCircle,
  FileText,
  MessageSquare,
  Sparkles,
  Receipt as ReceiptIcon,
  CreditCard,
  Edit2,
  Trash2,
} from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer;
  settings: BusinessSettings;
  receipts: Receipt[];
  payments: PaymentRecord[];
  onOpenVoiceInvoice: (customerId: string) => void;
  onOpenPayment: (customerId: string) => void;
  onViewReceipt: (receipt: Receipt) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onClose: () => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  settings,
  receipts,
  payments,
  onOpenVoiceInvoice,
  onOpenPayment,
  onViewReceipt,
  onEditCustomer,
  onDeleteCustomer,
  onClose,
}) => {
  const currency = settings.currency || 'C$';
  const [activeTab, setActiveTab] = useState<'receipts' | 'payments' | 'reminder'>('receipts');
  const [reminderMessage, setReminderMessage] = useState('');
  const [isGeneratingReminder, setIsGeneratingReminder] = useState(false);

  // Customer specific items
  const customerReceipts = receipts.filter((r) => r.customerId === customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);

  const generateAiReminder = async () => {
    setIsGeneratingReminder(true);
    try {
      const res = await fetch('/api/generate-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customer.name,
          balance: customer.currentBalance,
          businessName: settings.businessName,
          dueDate: customer.nextPaymentDueDate ? formatDate(customer.nextPaymentDueDate) : '',
          currency: currency,
        }),
      });
      const data = await res.json();
      setReminderMessage(data.message || '');
    } catch (err) {
      console.error('Error generating reminder:', err);
      setReminderMessage(
        `¡Hola ${customer.name}! 🏪 Le saludamos de *${settings.businessName}*. Le recordamos cordialmente su saldo pendiente de *${currency} ${customer.currentBalance}*. ¡Agradecemos mucho su preferencia! 🙏`
      );
    } finally {
      setIsGeneratingReminder(false);
    }
  };

  const handleSendReminder = () => {
    const textToSend =
      reminderMessage ||
      `¡Hola ${customer.name}! 🏪 Le saludamos de *${settings.businessName}*. Le recordamos cordialmente su saldo pendiente de *${currency} ${customer.currentBalance}*. ¡Agradecemos mucho su preferencia! 🙏`;
    openWhatsAppChat(customer.phone, textToSend);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold bg-white/15 px-2.5 py-0.5 rounded-full text-emerald-300">
                Detalle de Cuenta Corriente
              </span>
              {customer.currentBalance > 0 ? (
                <span className="text-xs font-semibold bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/40">
                  Saldo Pendiente
                </span>
              ) : (
                <span className="text-xs font-semibold bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Al Día
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold mt-1 text-white">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
              <span className="flex items-center gap-1 font-mono-receipt">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                {customer.phone || 'Sin WhatsApp'}
              </span>
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {customer.address}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditCustomer(customer)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-slate-200"
              title="Editar cliente"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Balance & Quick Actions Bar */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              SALDO PENDIENTE ACTUAL:
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black font-mono-receipt ${
                  customer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(customer.currentBalance, currency)}
              </span>
              {customer.creditLimit > 0 && (
                <span className="text-xs text-slate-400 font-mono-receipt">
                  / Límite: {formatCurrency(customer.creditLimit, currency)}
                </span>
              )}
            </div>
            {customer.nextPaymentDueDate && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                Vence/Pactado: {formatDate(customer.nextPaymentDueDate)}
              </span>
            )}
          </div>

          {/* Quick buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onOpenPayment(customer.id)}
              className="flex-1 sm:flex-none py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
            >
              <DollarSign className="w-4 h-4" />
              <span>Registrar Abono</span>
            </button>

            <button
              onClick={() => onOpenVoiceInvoice(customer.id)}
              className="flex-1 sm:flex-none py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Venta con Voz</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-5 shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('receipts')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 mr-4 transition ${
              activeTab === 'receipts'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ReceiptIcon className="w-4 h-4" />
            Recibos y Facturas ({customerReceipts.length})
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 mr-4 transition ${
              activeTab === 'payments'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Historial de Abonos ({customerPayments.length})
          </button>

          <button
            onClick={() => setActiveTab('reminder')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'reminder'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Recordatorio WhatsApp
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {/* TAB 1: RECEIPTS */}
          {activeTab === 'receipts' && (
            <div>
              {customerReceipts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <ReceiptIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>No hay recibos registrados para este cliente.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerReceipts.map((rec) => (
                    <div
                      key={rec.id}
                      onClick={() => onViewReceipt(rec)}
                      className="p-3.5 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-mono-receipt text-xs">
                          <span className="font-bold text-slate-800">{rec.receiptNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">{formatDate(rec.date)}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold ${
                              rec.type === 'payment'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {rec.type === 'payment' ? 'Abono' : 'Venta Crédito'}
                          </span>
                        </div>

                        {rec.items && rec.items.length > 0 && (
                          <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                            {rec.items.map((i) => `${i.quantity} ${i.product}`).join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="text-right font-mono-receipt">
                        <div className="text-xs font-bold text-slate-900">
                          {rec.type === 'payment'
                            ? `-${formatCurrency(rec.amountPaidNow, currency)}`
                            : formatCurrency(rec.subtotal, currency)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Saldo luego: {formatCurrency(rec.newBalance, currency)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === 'payments' && (
            <div>
              {customerPayments.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Aún no se han registrado abonos para este cliente.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {customerPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                          💵
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 font-mono-receipt">
                            Abono de {formatCurrency(pay.amount, currency)}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{formatDate(pay.date)}</span>
                            <span>• {pay.paymentMethod}</span>
                            {pay.notes && <span>• {pay.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono-receipt text-xs">
                        <span className="text-[10px] text-slate-400 block">Nuevo saldo:</span>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(pay.newBalance, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WHATSAPP REMINDER */}
          {activeTab === 'reminder' && (
            <div className="space-y-3">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Generador de Mensaje Amable para WhatsApp
                  </span>
                  <button
                    onClick={generateAiReminder}
                    disabled={isGeneratingReminder}
                    className="text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 px-3 py-1 rounded-xl shadow-2xs hover:bg-emerald-100 transition flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {isGeneratingReminder ? 'Redactando con IA...' : 'Redactar con IA'}
                  </button>
                </div>

                <p className="text-xs text-emerald-700 mb-2">
                  Envía un recordatorio educado, cálido y personalizado sobre su saldo pendiente de{' '}
                  <strong>{formatCurrency(customer.currentBalance, currency)}</strong>.
                </p>

                <textarea
                  rows={4}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  placeholder={`¡Hola Don/Doña ${customer.name}! Le saludamos de ${settings.businessName}...`}
                  className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
                />

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleSendReminder}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition"
                  >
                    <MessageSquare className="w-4 h-4 fill-current" />
                    <span>Enviar a WhatsApp ({customer.phone})</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              if (confirm(`¿Seguro que deseas eliminar el registro de ${customer.name}?`)) {
                onDeleteCustomer(customer.id);
                onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar Cliente
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
