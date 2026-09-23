import React, { useRef, useState } from 'react';
import { BusinessSettings, Receipt } from '../types';
import { formatCurrency, formatDate, generateWhatsAppReceiptText, openWhatsAppChat } from '../utils/whatsapp';
import { MessageSquare, Download, Share2, Copy, Check, Printer, Sparkles, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

interface DigitalReceiptCardProps {
  receipt: Receipt;
  settings: BusinessSettings;
  onCustomizeSettings?: () => void;
  onClose?: () => void;
}

export const DigitalReceiptCard: React.FC<DigitalReceiptCardProps> = ({
  receipt,
  settings,
  onCustomizeSettings,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const currency = settings.currency || 'C$';

  const handleCopyText = async () => {
    const text = generateWhatsAppReceiptText(receipt, settings);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSendWhatsApp = () => {
    const text = generateWhatsAppReceiptText(receipt, settings);
    openWhatsAppChat(receipt.customerPhone, text);
  };

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Recibo_${receipt.receiptNumber}_${receipt.customerName.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting receipt image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareNative = async () => {
    const text = generateWhatsAppReceiptText(receipt, settings);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recibo ${receipt.receiptNumber} - ${settings.businessName}`,
          text: text,
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      handleSendWhatsApp();
    }
  };

  const isAbonoOnly = receipt.type === 'payment';

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Top action bar */}
      <div className="w-full flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Vista Previa del Recibo Digital
        </span>
        {onCustomizeSettings && (
          <button
            onClick={onCustomizeSettings}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Editar Plantilla
          </button>
        )}
      </div>

      {/* The Printable / Downloadable Receipt Element */}
      <div
        ref={receiptRef}
        className="w-full bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative font-sans transition-all"
        style={{ maxWidth: '420px' }}
      >
        {/* Ticket Header Decorator */}
        <div className="bg-slate-900 text-white p-5 text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-2xl mb-2 backdrop-blur-sm shadow-inner">
            {settings.logoEmoji || '🏪'}
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white leading-tight">
            {settings.businessName}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">{settings.address}</p>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 mt-1 font-mono-receipt">
            <span>Tel: {settings.phone}</span>
            {settings.taxId && <span>• {settings.taxId}</span>}
          </div>

          <div className="mt-3 inline-block bg-white/15 px-3 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
            {isAbonoOnly ? 'COMPROBANTE DE ABONO' : 'FACTURA / CONTROL DE CRÉDITO'}
          </div>
        </div>

        {/* Receipt Meta & Customer Information */}
        <div className="p-4 bg-slate-50 border-b border-dashed border-slate-300 text-xs font-mono-receipt">
          <div className="flex justify-between items-center text-slate-600 mb-1.5">
            <span className="font-semibold text-slate-700">No. {receipt.receiptNumber}</span>
            <span>{formatDate(receipt.date)}</span>
          </div>
          <div className="flex justify-between items-start pt-1.5 border-t border-slate-200">
            <span className="text-slate-500">CLIENTE:</span>
            <span className="font-bold text-slate-800 text-right max-w-[220px]">
              {receipt.customerName}
            </span>
          </div>
          {receipt.customerPhone && (
            <div className="flex justify-between items-center text-slate-500 mt-1">
              <span>WHATSAPP:</span>
              <span className="text-slate-700">{receipt.customerPhone}</span>
            </div>
          )}
          {receipt.notes && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-slate-600 italic">
              Nota: {receipt.notes}
            </div>
          )}
        </div>

        {/* Items Table (if credit sale or combined) */}
        {!isAbonoOnly && receipt.items && receipt.items.length > 0 && (
          <div className="p-4">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono-receipt flex justify-between border-b border-slate-200 pb-1">
              <span>Cant. / Producto</span>
              <span>Total</span>
            </div>

            <div className="space-y-2 font-mono-receipt text-xs">
              {receipt.items.map((item, idx) => (
                <div key={item.id || idx} className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <span className="font-bold text-slate-800">
                      {item.quantity} {item.unit || 'und'}
                    </span>{' '}
                    <span className="text-slate-700 font-sans font-medium">{item.product}</span>
                    <div className="text-[10px] text-slate-400">
                      @{formatCurrency(item.unitPrice, currency)} c/u
                    </div>
                  </div>
                  <span className="font-bold text-slate-800 text-right whitespace-nowrap">
                    {formatCurrency(item.totalPrice, currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balance Breakdown & Totals */}
        <div className="p-4 bg-slate-50/80 border-t border-dashed border-slate-300 font-mono-receipt text-xs space-y-1.5">
          {!isAbonoOnly && (
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Venta:</span>
              <span className="font-semibold">{formatCurrency(receipt.subtotal, currency)}</span>
            </div>
          )}

          {receipt.previousBalance > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Saldo Anterior:</span>
              <span>{formatCurrency(receipt.previousBalance, currency)}</span>
            </div>
          )}

          {receipt.amountPaidNow > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded">
              <span>Abono Aplicado ({receipt.paymentMethod}):</span>
              <span>-{formatCurrency(receipt.amountPaidNow, currency)}</span>
            </div>
          )}

          {/* Resulting Balance Highlight Box */}
          <div
            className={`mt-2 p-3 rounded-xl border flex items-center justify-between ${
              receipt.newBalance > 0
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider">
                {receipt.newBalance > 0 ? 'SALDO PENDIENTE ACTUAL' : 'ESTADO DE LA CUENTA'}
              </div>
              <div className="text-[11px] text-slate-500 font-sans">
                {receipt.newBalance > 0 ? 'Por cobrar al cliente' : '¡Cuenta completamente saldada!'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold tracking-tight">
                {formatCurrency(receipt.newBalance, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Notes & Digital Stamp */}
        <div className="p-4 text-center bg-white border-t border-slate-100">
          {settings.customMessage && (
            <p className="text-xs italic text-slate-600 mb-1">
              "{settings.customMessage}"
            </p>
          )}
          {settings.receiptFooter && (
            <p className="text-[11px] text-slate-400">
              {settings.receiptFooter}
            </p>
          )}

          {/* Aesthetic Barcode */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col items-center justify-center">
            <div className="h-7 w-48 flex justify-between items-center opacity-70">
              {Array.from({ length: 42 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-slate-800 h-full"
                  style={{
                    width: (i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2) + 'px',
                    opacity: (i * 7) % 5 === 0 ? 0.3 : 0.9,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono-receipt text-slate-400 mt-1 tracking-widest">
              *{receipt.receiptNumber}*
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: WhatsApp, Download PNG, Copy */}
      <div className="w-full mt-4 space-y-2">
        <button
          onClick={handleSendWhatsApp}
          className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition active:scale-[0.99]"
        >
          <MessageSquare className="w-5 h-5 fill-current" />
          <span>Enviar Recibo por WhatsApp</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>{isExporting ? 'Generando...' : 'Descargar Imagen'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600" />
                <span>Copiar Detalle</span>
              </>
            )}
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 text-center font-medium mt-1"
          >
            Cerrar Recibo
          </button>
        )}
      </div>
    </div>
  );
};
