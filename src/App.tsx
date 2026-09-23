import React, { useState, useEffect } from 'react';
import { Customer, Receipt, PaymentRecord, BusinessSettings } from './types';
import { StorageService } from './utils/storage';
import { formatCurrency, formatDate } from './utils/whatsapp';
import { CustomerCardList } from './components/CustomerCardList';
import { DigitalReceiptCard } from './components/DigitalReceiptCard';
import { VoiceInvoiceModal } from './components/VoiceInvoiceModal';
import { QuickPaymentModal } from './components/QuickPaymentModal';
import { CustomerModal } from './components/CustomerModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { ReceiptsList } from './components/ReceiptsList';
import { SettingsModal } from './components/SettingsModal';
import {
  Users,
  Receipt as ReceiptIcon,
  Mic,
  DollarSign,
  Settings,
  Sparkles,
  TrendingUp,
  CreditCard,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export default function App() {
  // App state
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [receipts, setReceipts] = useState<Receipt[]>(() => StorageService.getReceipts());
  const [payments, setPayments] = useState<PaymentRecord[]>(() => StorageService.getPayments());
  const [settings, setSettings] = useState<BusinessSettings>(() => StorageService.getSettings());

  // Active view tab: 'customers' | 'receipts' | 'payments'
  const [currentTab, setCurrentTab] = useState<'customers' | 'receipts' | 'payments'>('customers');

  // Modals state
  const [isVoiceInvoiceOpen, setIsVoiceInvoiceOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(undefined);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState<string | undefined>(undefined);

  const [activeReceiptForModal, setActiveReceiptForModal] = useState<Receipt | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [detailedCustomerId, setDetailedCustomerId] = useState<string | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Sync to storage
  useEffect(() => {
    StorageService.saveCustomers(customers);
  }, [customers]);

  useEffect(() => {
    StorageService.saveReceipts(receipts);
  }, [receipts]);

  useEffect(() => {
    StorageService.savePayments(payments);
  }, [payments]);

  useEffect(() => {
    StorageService.saveSettings(settings);
  }, [settings]);

  const currency = settings.currency || 'C$';

  // Overall Financial KPIs
  const totalPendingDebt = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const debtorsCount = customers.filter((c) => c.currentBalance > 0).length;

  // Payments collected today
  const todayStr = new Date().toISOString().split('T')[0];
  const paymentsToday = payments
    .filter((p) => p.date && p.date.startsWith(todayStr))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Handlers
  const handleSaveCustomer = (savedCustomer: Customer) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === savedCustomer.id);
      if (exists) {
        return prev.map((c) => (c.id === savedCustomer.id ? savedCustomer : c));
      }
      return [savedCustomer, ...prev];
    });
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    setDetailedCustomerId(null);
  };

  // Called when invoice is generated via voice or manual
  const handleSaveInvoiceReceipt = (newReceipt: Receipt, newBalance: number) => {
    // 1. Add receipt
    setReceipts((prev) => [newReceipt, ...prev]);

    // 2. Update customer balance and last interaction
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === newReceipt.customerId) {
          return {
            ...c,
            currentBalance: newBalance,
            lastPaymentDate: newReceipt.amountPaidNow > 0 ? newReceipt.date : c.lastPaymentDate,
          };
        }
        return c;
      })
    );

    // 3. If there was an immediate downpayment, record it in payments log
    if (newReceipt.amountPaidNow > 0) {
      const paymentRec: PaymentRecord = {
        id: 'pay_' + Math.random().toString(36).substring(2, 9),
        customerId: newReceipt.customerId,
        customerName: newReceipt.customerName,
        amount: newReceipt.amountPaidNow,
        date: newReceipt.date,
        paymentMethod: newReceipt.paymentMethod,
        previousBalance: newReceipt.previousBalance + newReceipt.subtotal,
        newBalance: newBalance,
        notes: `Abono inmediato en compra ${newReceipt.receiptNumber}`,
        receiptNumber: newReceipt.receiptNumber,
      };
      setPayments((prev) => [paymentRec, ...prev]);
    }

    setIsVoiceInvoiceOpen(false);
    // Immediately open digital receipt card for preview & WhatsApp sending!
    setActiveReceiptForModal(newReceipt);
  };

  // Called when quick abono is recorded
  const handleSavePaymentReceipt = (
    paymentReceipt: Receipt,
    newBalance: number,
    paymentRecord: PaymentRecord
  ) => {
    // 1. Add receipt
    setReceipts((prev) => [paymentReceipt, ...prev]);

    // 2. Add payment record
    setPayments((prev) => [paymentRecord, ...prev]);

    // 3. Update customer balance
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === paymentReceipt.customerId) {
          return {
            ...c,
            currentBalance: newBalance,
            lastPaymentDate: paymentReceipt.date,
          };
        }
        return c;
      })
    );

    setIsPaymentModalOpen(false);
    // Immediately display payment receipt for WhatsApp sharing!
    setActiveReceiptForModal(paymentReceipt);
  };

  const selectedDetailCustomer = customers.find((c) => c.id === detailedCustomerId);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-24 sm:pb-8">
      {/* APP HEADER */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-2xl flex items-center justify-center shadow-inner">
              {settings.logoEmoji || '🏪'}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>{settings.businessName}</span>
              </h1>
              <p className="text-[11px] text-emerald-400 font-medium">
                Control de Créditos & Recibos Digitales
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
              title="Personalizar Plantilla y Negocio"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Plantilla Recibo</span>
            </button>
          </div>
        </div>

        {/* METRICS / STATS STRIP */}
        <div className="border-t border-slate-800 bg-slate-950/60 px-4 py-2.5">
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-2 text-center sm:text-left">
            {/* Total por cobrar */}
            <div className="bg-white/5 rounded-xl p-2 sm:px-3 sm:py-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Total por Cobrar
              </span>
              <span className="text-xs sm:text-sm font-extrabold font-mono-receipt text-rose-400">
                {formatCurrency(totalPendingDebt, currency)}
              </span>
            </div>

            {/* Abonos hoy */}
            <div className="bg-white/5 rounded-xl p-2 sm:px-3 sm:py-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Abonos Recibidos Hoy
              </span>
              <span className="text-xs sm:text-sm font-extrabold font-mono-receipt text-emerald-400">
                {formatCurrency(paymentsToday, currency)}
              </span>
            </div>

            {/* Clientes con crédito */}
            <div className="bg-white/5 rounded-xl p-2 sm:px-3 sm:py-2">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                Clientes Deudores
              </span>
              <span className="text-xs sm:text-sm font-extrabold font-mono-receipt text-amber-400">
                {debtorsCount} de {customers.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 flex-1">
        {/* QUICK ACTION HERO BAR */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-emerald-950/15 mb-4 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-bold text-emerald-100 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Dictado de Voz Inteligente
              </div>
              <h2 className="text-lg sm:text-xl font-black">¿Nueva venta al crédito?</h2>
              <p className="text-xs text-emerald-100 max-w-md mt-0.5">
                Dicta las cantidades y productos por micrófono para llenar la factura al instante.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPreselectedCustomerId(undefined);
                  setIsVoiceInvoiceOpen(true);
                }}
                className="flex-1 sm:flex-none py-3 px-4 bg-white text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Mic className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Dictar Venta</span>
              </button>

              <button
                onClick={() => {
                  setPaymentCustomerId(undefined);
                  setIsPaymentModalOpen(true);
                }}
                className="flex-1 sm:flex-none py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
              >
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Registrar Abono</span>
              </button>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs mb-4">
          <button
            onClick={() => setCurrentTab('customers')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              currentTab === 'customers'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Control de Clientes ({customers.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('receipts')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              currentTab === 'receipts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ReceiptIcon className="w-4 h-4" />
            <span>Recibos Digitales ({receipts.length})</span>
          </button>

          <button
            onClick={() => setCurrentTab('payments')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              currentTab === 'payments'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Historial Abonos ({payments.length})</span>
          </button>
        </div>

        {/* TAB 1: CUSTOMERS */}
        {currentTab === 'customers' && (
          <CustomerCardList
            customers={customers}
            settings={settings}
            onSelectCustomer={(c) => setDetailedCustomerId(c.id)}
            onOpenVoiceInvoiceForCustomer={(cId) => {
              setPreselectedCustomerId(cId);
              setIsVoiceInvoiceOpen(true);
            }}
            onOpenPaymentForCustomer={(cId) => {
              setPaymentCustomerId(cId);
              setIsPaymentModalOpen(true);
            }}
            onAddNewCustomer={() => {
              setEditingCustomer(null);
              setIsCustomerModalOpen(true);
            }}
          />
        )}

        {/* TAB 2: RECEIPTS */}
        {currentTab === 'receipts' && (
          <ReceiptsList
            receipts={receipts}
            settings={settings}
            onSelectReceipt={(r) => setActiveReceiptForModal(r)}
          />
        )}

        {/* TAB 3: PAYMENTS LOG */}
        {currentTab === 'payments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono-receipt">
                Historial Cronológico de Abonos Registrados
              </span>
              <button
                onClick={() => {
                  setPaymentCustomerId(undefined);
                  setIsPaymentModalOpen(true);
                }}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-xl transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Abono
              </button>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay abonos registrados aún.
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50 hover:bg-emerald-50/40 rounded-xl border border-slate-200 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        💵
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{p.customerName}</h4>
                        <div className="text-[11px] text-slate-500 font-mono-receipt flex items-center gap-2">
                          <span>{formatDate(p.date)}</span>
                          <span>• {p.paymentMethod}</span>
                          {p.receiptNumber && <span>• No. {p.receiptNumber}</span>}
                        </div>
                        {p.notes && <p className="text-[10px] text-slate-400 italic">{p.notes}</p>}
                      </div>
                    </div>

                    <div className="text-right font-mono-receipt">
                      <span className="text-sm font-extrabold text-emerald-700 block">
                        +{formatCurrency(p.amount, currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Nuevo saldo: {formatCurrency(p.newBalance, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM FLOATING ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 p-2 z-40 flex items-center justify-around">
        <button
          onClick={() => setCurrentTab('customers')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${
            currentTab === 'customers' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Clientes</span>
        </button>

        {/* Center Mic Button */}
        <button
          onClick={() => {
            setPreselectedCustomerId(undefined);
            setIsVoiceInvoiceOpen(true);
          }}
          className="-mt-5 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-700/40 flex flex-col items-center justify-center active:scale-95 transition"
        >
          <Mic className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={() => setCurrentTab('receipts')}
          className={`flex flex-col items-center py-1 px-3 rounded-xl text-[10px] font-bold ${
            currentTab === 'receipts' ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          <ReceiptIcon className="w-5 h-5 mb-0.5" />
          <span>Recibos</span>
        </button>
      </div>

      {/* MODAL 1: VOICE INVOICE (Natural Voice Dictation Core Feature) */}
      {isVoiceInvoiceOpen && (
        <VoiceInvoiceModal
          customers={customers}
          settings={settings}
          preselectedCustomerId={preselectedCustomerId}
          onSaveReceipt={handleSaveInvoiceReceipt}
          onClose={() => setIsVoiceInvoiceOpen(false)}
        />
      )}

      {/* MODAL 2: QUICK PAYMENT / ABONO */}
      {isPaymentModalOpen && (
        <QuickPaymentModal
          customers={customers}
          settings={settings}
          preselectedCustomerId={paymentCustomerId}
          onSavePayment={handleSavePaymentReceipt}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* MODAL 3: DIGITAL RECEIPT PREVIEW (Customizable, WhatsApp & Image export) */}
      {activeReceiptForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-transparent my-auto max-w-md w-full">
            <DigitalReceiptCard
              receipt={activeReceiptForModal}
              settings={settings}
              onCustomizeSettings={() => setIsSettingsModalOpen(true)}
              onClose={() => setActiveReceiptForModal(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL 4: CUSTOMER ADD / EDIT */}
      {isCustomerModalOpen && (
        <CustomerModal
          customer={editingCustomer}
          settings={settings}
          onSave={handleSaveCustomer}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* MODAL 5: CUSTOMER DETAIL ACCOUNT LEDGER */}
      {selectedDetailCustomer && (
        <CustomerDetailModal
          customer={selectedDetailCustomer}
          settings={settings}
          receipts={receipts}
          payments={payments}
          onOpenVoiceInvoice={(cId) => {
            setDetailedCustomerId(null);
            setPreselectedCustomerId(cId);
            setIsVoiceInvoiceOpen(true);
          }}
          onOpenPayment={(cId) => {
            setDetailedCustomerId(null);
            setPaymentCustomerId(cId);
            setIsPaymentModalOpen(true);
          }}
          onViewReceipt={(r) => {
            setActiveReceiptForModal(r);
          }}
          onEditCustomer={(c) => {
            setDetailedCustomerId(null);
            setEditingCustomer(c);
            setIsCustomerModalOpen(true);
          }}
          onDeleteCustomer={handleDeleteCustomer}
          onClose={() => setDetailedCustomerId(null)}
        />
      )}

      {/* MODAL 6: SETTINGS & RECEIPT TEMPLATE CUSTOMIZER */}
      {isSettingsModalOpen && (
        <SettingsModal
          settings={settings}
          onSave={(newSettings) => setSettings(newSettings)}
          onClose={() => setIsSettingsModalOpen(false)}
          onDataRestored={() => {
            setCustomers(StorageService.getCustomers());
            setReceipts(StorageService.getReceipts());
            setPayments(StorageService.getPayments());
            setSettings(StorageService.getSettings());
          }}
        />
      )}
    </div>
  );
}
