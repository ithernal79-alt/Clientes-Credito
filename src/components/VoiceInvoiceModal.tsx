import React, { useState } from 'react';
import { Customer, InvoiceItem, BusinessSettings, Receipt } from '../types';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { formatCurrency } from '../utils/whatsapp';
import {
  Mic,
  MicOff,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  X,
  User,
  ShoppingBag,
  DollarSign,
  ArrowRight,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceInvoiceModalProps {
  customers: Customer[];
  settings: BusinessSettings;
  preselectedCustomerId?: string;
  onSaveReceipt: (receipt: Receipt, updatedCustomerBalance: number) => void;
  onClose: () => void;
}

export const VoiceInvoiceModal: React.FC<VoiceInvoiceModalProps> = ({
  customers,
  settings,
  preselectedCustomerId,
  onSaveReceipt,
  onClose,
}) => {
  const {
    isListening,
    transcript,
    setTranscript,
    interimTranscript,
    isSupported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    preselectedCustomerId || (customers.length > 0 ? customers[0].id : '')
  );

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSource, setParseSource] = useState<string | null>(null);

  const [amountPaidNow, setAmountPaidNow] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta' | 'otro'>('efectivo');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const currency = settings.currency || 'C$';
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Sync speech transcript into input
  const fullTranscript = transcript + (interimTranscript ? ` ${interimTranscript}` : '');

  // Calculate totals
  const subtotal = items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  const prevBalance = selectedCustomer ? selectedCustomer.currentBalance : 0;
  const parsedPaidNow = parseFloat(amountPaidNow) || 0;
  const newBalance = Math.max(0, prevBalance + subtotal - parsedPaidNow);

  // Process voice transcript
  const processVoiceText = async (textToParse: string) => {
    if (!textToParse || !textToParse.trim()) {
      setParseError('Por favor dicta o escribe lo que compró el cliente.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const response = await fetch('/api/parse-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceText: textToParse }),
      });

      if (!response.ok) {
        throw new Error('Servidor no disponible, usando analizador local');
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        setItems(data.items);
        setParseSource(data.source === 'gemini' ? 'Inteligencia Artificial Gemini' : 'Reconocedor Rápido');

        if (data.detectedCustomerName) {
          const match = customers.find((c) =>
            c.name.toLowerCase().includes(data.detectedCustomerName.toLowerCase())
          );
          if (match) setSelectedCustomerId(match.id);
        }

        if (data.detectedPaymentOrDeposit && data.detectedPaymentOrDeposit > 0) {
          setAmountPaidNow(data.detectedPaymentOrDeposit.toString());
        }

        if (data.notes) {
          setInvoiceNotes((prev) => (prev ? `${prev}. ${data.notes}` : data.notes));
        }
      } else {
        // Try client emergency parse
        const fallbackItems = emergencyClientParse(textToParse);
        if (fallbackItems.length > 0) {
          setItems(fallbackItems);
          setParseSource('Procesador Local');
        } else {
          setParseError('No se identificaron productos. Puedes ingresar la cantidad y precio directamente en la tabla.');
        }
      }
    } catch (err: any) {
      console.warn('API fetch error, executing local parser:', err);
      const fallbackItems = emergencyClientParse(textToParse);
      if (fallbackItems.length > 0) {
        setItems(fallbackItems);
        setParseSource('Procesador Local');
      } else {
        setParseError('No se pudo procesar la frase. Puedes agregar los productos directamente en la tabla.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const emergencyClientParse = (txt: string): InvoiceItem[] => {
    const list: InvoiceItem[] = [];
    const parts = txt.split(/[,;\n]|\by luego\b|\bademas\b|\bademás\b/i);
    for (const p of parts) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      const match = trimmed.match(
        /^(\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ]+)?(?:\s+de)?\s+([a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]+?)(?:\s+(?:a|en|c\/u|cada uno|por)?\s+(\d+(?:[.,]\d+)?))(?:\s*=\s*(?:[cC]\$|\$)?\s*(\d+(?:[.,]\d+)?))?$/i
      );
      if (match) {
        const qty = parseFloat(match[1].replace(',', '.'));
        let unit = match[2]?.trim() || '';
        let prod = match[3]?.trim() || '';
        const price = parseFloat(match[4].replace(',', '.'));
        const total = match[5] ? parseFloat(match[5].replace(',', '.')) : qty * price;

        const commonUnits = [
          'libras', 'libra', 'lbs', 'lb', 'litros', 'litro', 'lts', 'lt',
          'kilos', 'kilo', 'kg', 'bolsas', 'bolsa', 'unidades', 'unidad',
          'huevos', 'huevo', 'paquetes', 'paquete', 'cajas', 'caja',
          'onzas', 'onza', 'botellas', 'botella', 'latas', 'lata',
        ];

        if (!commonUnits.includes(unit.toLowerCase()) && unit) {
          prod = `${unit} ${prod}`.trim();
          unit = 'und';
        }
        if (unit.toLowerCase() === 'huevos' && (!prod || prod.length === 0)) {
          prod = 'Huevos';
          unit = 'unidades';
        }
        if (!prod) {
          prod = unit || 'Artículo';
        }
        prod = prod.charAt(0).toUpperCase() + prod.slice(1);

        list.push({
          id: 'it_' + Math.random().toString(36).substring(2, 7),
          quantity: qty,
          unit: unit || 'und',
          product: prod,
          unitPrice: price,
          totalPrice: total,
        });
      }
    }
    return list;
  };

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
      // Auto-process what was dictated so far
      if (fullTranscript.trim()) {
        processVoiceText(fullTranscript);
      }
    } else {
      resetTranscript();
      startListening();
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            const q = field === 'quantity' ? Number(value) || 0 : item.quantity;
            const p = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
            updated.totalPrice = Math.round(q * p * 100) / 100;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const addNewBlankItem = () => {
    const newItem: InvoiceItem = {
      id: 'it_' + Math.random().toString(36).substring(2, 7),
      quantity: 1,
      unit: 'und',
      product: '',
      unitPrice: 0,
      totalPrice: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleFinalizeInvoice = () => {
    if (!selectedCustomer) {
      alert('Por favor selecciona un cliente para registrar la venta al crédito.');
      return;
    }

    if (items.length === 0) {
      alert('Debes agregar al menos un producto a la factura.');
      return;
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-5)}`;
    const newReceipt: Receipt = {
      id: 'rec_' + Math.random().toString(36).substring(2, 9),
      receiptNumber,
      type: 'credit_sale',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      date: new Date().toISOString(),
      items: items,
      subtotal: subtotal,
      previousBalance: prevBalance,
      amountPaidNow: parsedPaidNow,
      newBalance: newBalance,
      paymentMethod: paymentMethod,
      notes: invoiceNotes,
      createdAt: new Date().toISOString(),
    };

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    onSaveReceipt(newReceipt, newBalance);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Nueva Venta al Crédito</h2>
              <p className="text-xs text-emerald-100">
                Dicta por voz o escribe para llenar la factura automáticamente
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

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Customer Selection Card */}
          <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                Cliente al Crédito:
              </label>
              {selectedCustomer && (
                <div className="text-xs">
                  <span className="text-slate-500">Saldo pendiente actual: </span>
                  <span
                    className={`font-bold font-mono-receipt ${
                      selectedCustomer.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(selectedCustomer.currentBalance, currency)}
                  </span>
                </div>
              )}
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none shadow-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.currentBalance > 0 ? `(Debe ${formatCurrency(c.currentBalance, currency)})` : '(Al día)'}
                </option>
              ))}
            </select>
          </div>

          {/* VOICE DICTATION BOX */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-200/80 relative overflow-hidden shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  {isListening && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      isListening ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                  />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {isListening ? 'Escuchando tu voz...' : 'Dictado de Productos por Micrófono'}
                </span>
              </div>

              {parseSource && (
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  {parseSource}
                </span>
              )}
            </div>

            {/* Microphone button & Live text */}
            <div className="flex flex-col sm:flex-row items-center gap-3 my-2">
              <button
                type="button"
                onClick={handleToggleListening}
                className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse shadow-rose-500/40 ring-4 ring-rose-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>Detener y Procesar</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-white" />
                    <span>Presionar para Dictar</span>
                  </>
                )}
              </button>

              <div className="text-xs text-slate-600 flex-1 text-center sm:text-left">
                {isListening ? (
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-rose-600 font-bold">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <span>Habla claro: di los productos, cantidades y precios...</span>
                  </div>
                ) : (
                  <span>
                    Presiona el botón verde, habla al micrófono y al terminar presiona <b>Detener</b> para llenar la factura.
                  </span>
                )}
              </div>
            </div>

            {/* Input area for live transcription or manual editing */}
            <div className="mt-3">
              <textarea
                rows={2}
                value={fullTranscript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Las palabras que dictes aparecerán aquí en tiempo real..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner"
              />
            </div>

            {/* Process Button */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => processVoiceText(fullTranscript)}
                disabled={isParsing || !fullTranscript.trim()}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isParsing ? 'Procesando frase...' : 'Procesar Texto Dictado'}</span>
              </button>

              {fullTranscript && (
                <button
                  type="button"
                  onClick={resetTranscript}
                  className="text-xs text-slate-400 hover:text-slate-600 underline font-medium"
                >
                  Limpiar texto
                </button>
              )}
            </div>

            {parseError && (
              <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{parseError}</span>
              </div>
            )}
            {voiceError && (
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{voiceError}</span>
              </div>
            )}
          </div>

          {/* TABLE OF PRODUCTS (Auto-filled by voice) */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono-receipt">
                  Detalle de la Factura ({items.length} productos)
                </span>
              </div>
              <button
                type="button"
                onClick={addNewBlankItem}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs hover:bg-emerald-50 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Renglón
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Aún no hay productos en la factura</p>
                <p className="mt-0.5">Dicta con el botón de micrófono arriba o pulsa "Agregar Renglón" para escribir.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Header row */}
                <div className="grid grid-cols-12 gap-2 p-2.5 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase font-mono-receipt">
                  <div className="col-span-3 sm:col-span-2 text-center">Cant. / Und</div>
                  <div className="col-span-5 sm:col-span-5">Producto</div>
                  <div className="col-span-2 sm:col-span-2 text-right">P. Unit</div>
                  <div className="col-span-2 sm:col-span-2 text-right">Total</div>
                  <div className="col-span-0 sm:col-span-1 hidden sm:block"></div>
                </div>

                {/* Rows */}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-slate-50 transition"
                  >
                    {/* Cant & Unit */}
                    <div className="col-span-3 sm:col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-12 p-1 text-center font-bold font-mono-receipt text-xs border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        placeholder="und"
                        className="w-12 p-1 text-center text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>

                    {/* Producto */}
                    <div className="col-span-5 sm:col-span-5">
                      <input
                        type="text"
                        value={item.product}
                        onChange={(e) => updateItem(item.id, 'product', e.target.value)}
                        placeholder="Nombre del producto"
                        className="w-full p-1 text-xs font-semibold border border-slate-300 rounded bg-white"
                      />
                    </div>

                    {/* Precio Unitario */}
                    <div className="col-span-2 sm:col-span-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full p-1 text-right font-mono-receipt text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>

                    {/* Total */}
                    <div className="col-span-2 sm:col-span-2 text-right font-mono-receipt text-xs font-bold text-slate-800">
                      {formatCurrency(item.totalPrice, currency)}
                    </div>

                    {/* Delete button */}
                    <div className="col-span-12 sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Subtotal preview footer */}
            {items.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs font-mono-receipt font-bold">
                <span className="text-slate-600 uppercase">Subtotal Compra Actual:</span>
                <span className="text-base text-slate-900">{formatCurrency(subtotal, currency)}</span>
              </div>
            )}
          </div>

          {/* DOWNPAYMENT & BALANCE RECALCULATION */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Abono Inmediato y Cálculo de Saldo
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  ¿Abona algo hoy al momento? ({currency}):
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountPaidNow}
                    onChange={(e) => setAmountPaidNow(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold font-mono-receipt text-emerald-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Método de Pago del Abono:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
                >
                  <option value="efectivo">Efectivo 💵</option>
                  <option value="transferencia">Transferencia Bancaria 📲</option>
                  <option value="tarjeta">Tarjeta Débito/Crédito 💳</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            {/* Mathematical Summary Card */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5 font-mono-receipt text-xs">
              <div className="flex justify-between text-slate-500">
                <span>(+) Deuda previa del cliente:</span>
                <span>{formatCurrency(prevBalance, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-800 font-semibold">
                <span>(+) Total de esta compra:</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              {parsedPaidNow > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>(-) Abono recibido ahora:</span>
                  <span>-{formatCurrency(parsedPaidNow, currency)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold">
                <span className="text-slate-900 uppercase">Nuevo Saldo Pendiente:</span>
                <span
                  className={`text-lg ${
                    newBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(newBalance, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Repayment Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Fecha acordada de pago:
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Notas u observaciones (opcional):
              </label>
              <input
                type="text"
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                placeholder="Ej. Pagará en quincena..."
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleFinalizeInvoice}
            disabled={items.length === 0}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-700/20 flex items-center gap-2 transition active:scale-95"
          >
            <span>Generar Recibo Digital</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
