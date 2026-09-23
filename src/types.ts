export interface InvoiceItem {
  id: string;
  quantity: number;
  unit: string;
  product: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  creditLimit: number;
  currentBalance: number; // Saldo pendiente
  lastPaymentDate: string | null;
  nextPaymentDueDate: string | null;
  notes: string;
  createdAt: string;
}

export type TransactionType = 'credit_sale' | 'payment' | 'combined';

export interface Receipt {
  id: string;
  receiptNumber: string;
  type: TransactionType;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  previousBalance: number;
  amountPaidNow: number;
  newBalance: number;
  paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  notes: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentMethod: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  previousBalance: number;
  newBalance: number;
  notes: string;
  receiptNumber?: string;
}

export interface BusinessSettings {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  taxId: string;
  currency: string;
  customMessage: string;
  themeColor: 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose';
  logoEmoji: string;
  receiptFooter: string;
}
