import { BusinessSettings, Receipt } from '../types';

export function formatCurrency(amount: number, currency: string = 'C$'): string {
  return `${currency} ${Number(amount || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('es-NI', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

export function cleanPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return '';
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // If it starts with '+', remove it for the wa.me url
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } else if (cleaned.length === 8 && !cleaned.startsWith('505')) {
    // If standard 8-digit phone without country code, default to Nicaragua +505
    cleaned = '505' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppReceiptText(receipt: Receipt, settings: BusinessSettings): string {
  const currency = settings.currency || 'C$';
  const isPaymentOnly = receipt.type === 'payment';

  let msg = `*🧾 RECIBO DIGITAL - ${settings.businessName.toUpperCase()}*\n`;
  msg += `_Comprobante Oficial No: ${receipt.receiptNumber}_\n`;
  msg += `─────────────────────────\n`;
  msg += `📅 *Fecha:* ${formatDate(receipt.date)}\n`;
  msg += `👤 *Cliente:* ${receipt.customerName}\n`;
  if (receipt.notes) {
    msg += `📝 *Nota:* ${receipt.notes}\n`;
  }
  msg += `─────────────────────────\n`;

  if (isPaymentOnly) {
    msg += `*COMPROBANTE DE ABONO / PAGO*\n\n`;
    msg += `💵 *Monto Abonado:* ${formatCurrency(receipt.amountPaidNow, currency)}\n`;
    msg += `💳 *Método:* ${receipt.paymentMethod.toUpperCase()}\n`;
    msg += `📉 *Saldo Anterior:* ${formatCurrency(receipt.previousBalance, currency)}\n`;
    msg += `*👉 NUEVO SALDO PENDIENTE: ${formatCurrency(receipt.newBalance, currency)}*\n`;
  } else {
    msg += `*DETALLE DE PRODUCTOS:*\n`;
    receipt.items.forEach((item, index) => {
      const unitText = item.unit ? ` ${item.unit}` : '';
      msg += `${index + 1}. *${item.quantity}${unitText}* de ${item.product}\n`;
      msg += `   └ a ${formatCurrency(item.unitPrice, currency)} c/u = *${formatCurrency(item.totalPrice, currency)}*\n`;
    });

    msg += `─────────────────────────\n`;
    msg += `🛍️ *Subtotal Compra:* ${formatCurrency(receipt.subtotal, currency)}\n`;
    
    if (receipt.previousBalance > 0) {
      msg += `📑 *Saldo Anterior:* ${formatCurrency(receipt.previousBalance, currency)}\n`;
    }

    if (receipt.amountPaidNow > 0) {
      msg += `💵 *Abono Hoy:* -${formatCurrency(receipt.amountPaidNow, currency)} (${receipt.paymentMethod})\n`;
    }

    msg += `─────────────────────────\n`;
    if (receipt.newBalance <= 0) {
      msg += `✅ *ESTADO DE CUENTA: PAGADO AL DÍA (C$ 0.00)*\n`;
    } else {
      msg += `*🔴 SALDO PENDIENTE ACTUAL: ${formatCurrency(receipt.newBalance, currency)}*\n`;
    }
  }

  msg += `─────────────────────────\n`;
  if (settings.customMessage) {
    msg += `💬 _"${settings.customMessage}"_\n\n`;
  }
  if (settings.receiptFooter) {
    msg += `📌 _${settings.receiptFooter}_\n`;
  }
  msg += `📞 *Atención:* ${settings.phone} | ${settings.ownerName}`;

  return msg;
}

export function openWhatsAppChat(phone: string, text: string): void {
  const cleanPhone = cleanPhoneNumberForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, '_blank');
}
