import { BusinessSettings, Customer, PaymentRecord, Receipt } from '../types';

const STORAGE_KEYS = {
  CUSTOMERS: 'credifacil_customers_v1',
  RECEIPTS: 'credifacil_receipts_v1',
  PAYMENTS: 'credifacil_payments_v1',
  SETTINGS: 'credifacil_settings_v1',
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: 'Abarrotes & Pulpería La Bendición',
  ownerName: 'Doña Gloria Martínez',
  phone: '+505 8899 4422',
  address: 'Barrio Monseñor Lezcano, semáforos 2c al sur, Managua',
  taxId: 'RUC 001-150882-0003K',
  currency: 'C$',
  customMessage: '¡Gracias por su preferencia! Cuentas claras conservan amistades.',
  themeColor: 'emerald',
  logoEmoji: '🏪',
  receiptFooter: 'Recuerde reportar su abono enviando foto o comprobante.',
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    name: 'Doña Carmen Ruiz Gómez',
    phone: '+505 8456 7890',
    address: 'Frente al parque, casa esquinera color verde',
    creditLimit: 3000,
    currentBalance: 420,
    lastPaymentDate: '2026-09-18T10:30:00Z',
    nextPaymentDueDate: '2026-09-25T00:00:00Z',
    notes: 'Paga puntual cada viernes después de cobrar quincena',
    createdAt: '2026-08-10T08:00:00Z',
  },
  {
    id: 'cust_2',
    name: 'Don Roberto Blandón',
    phone: '+505 8822 3344',
    address: 'De la ermita 1c abajo, portón negro',
    creditLimit: 2500,
    currentBalance: 685,
    lastPaymentDate: '2026-09-15T16:00:00Z',
    nextPaymentDueDate: '2026-09-23T00:00:00Z',
    notes: 'Cliente de confianza desde 2024. Suele abonar por transferencia.',
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'cust_3',
    name: 'Prof. Carlos Mendoza',
    phone: '+505 8911 2233',
    address: 'Costado norte de la escuela primaria',
    creditLimit: 2000,
    currentBalance: 0,
    lastPaymentDate: '2026-09-20T14:15:00Z',
    nextPaymentDueDate: '2026-10-05T00:00:00Z',
    notes: 'Cuenta al día. Liquidó su saldo total el fin de semana pasado.',
    createdAt: '2026-08-15T09:00:00Z',
  },
  {
    id: 'cust_4',
    name: 'Xiomara Torres',
    phone: '+505 7788 9900',
    address: 'Calle principal, frente al taller mecánico',
    creditLimit: 1500,
    currentBalance: 890,
    lastPaymentDate: '2026-09-10T12:00:00Z',
    nextPaymentDueDate: '2026-09-20T00:00:00Z',
    notes: 'Recordar cobro cordial fin de semana.',
    createdAt: '2026-07-20T11:00:00Z',
  },
];

export const INITIAL_RECEIPTS: Receipt[] = [
  {
    id: 'rec_101',
    receiptNumber: 'REC-00101',
    type: 'credit_sale',
    customerId: 'cust_1',
    customerName: 'Doña Carmen Ruiz Gómez',
    customerPhone: '+505 8456 7890',
    date: '2026-09-18T10:30:00Z',
    items: [
      { id: 'it_1', quantity: 4, unit: 'libras', product: 'Arroz Faisán', unitPrice: 27, totalPrice: 108 },
      { id: 'it_2', quantity: 2, unit: 'litros', product: 'Leche La Perfecta', unitPrice: 42, totalPrice: 84 },
      { id: 'it_3', quantity: 5, unit: 'unidades', product: 'Huevos de Granja', unitPrice: 7, totalPrice: 35 },
    ],
    subtotal: 227,
    previousBalance: 393,
    amountPaidNow: 200,
    newBalance: 420,
    paymentMethod: 'efectivo',
    notes: 'Compra a cuenta con abono parcial inmediato',
    createdAt: '2026-09-18T10:30:00Z',
  },
  {
    id: 'rec_102',
    receiptNumber: 'REC-00102',
    type: 'credit_sale',
    customerId: 'cust_2',
    customerName: 'Don Roberto Blandón',
    customerPhone: '+505 8822 3344',
    date: '2026-09-21T15:20:00Z',
    items: [
      { id: 'it_4', quantity: 5, unit: 'libras', product: 'Frijol Rojo Nacional', unitPrice: 34, totalPrice: 170 },
      { id: 'it_5', quantity: 1, unit: 'galón', product: 'Aceite Corona', unitPrice: 195, totalPrice: 195 },
      { id: 'it_6', quantity: 2, unit: 'libras', product: 'Azúcar Blanca', unitPrice: 16, totalPrice: 32 },
    ],
    subtotal: 397,
    previousBalance: 288,
    amountPaidNow: 0,
    newBalance: 685,
    paymentMethod: 'efectivo',
    notes: 'Crédito para fin de mes',
    createdAt: '2026-09-21T15:20:00Z',
  },
];

export const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay_1',
    customerId: 'cust_1',
    customerName: 'Doña Carmen Ruiz Gómez',
    amount: 200,
    date: '2026-09-18T10:30:00Z',
    paymentMethod: 'efectivo',
    previousBalance: 620,
    newBalance: 420,
    notes: 'Abono en mostrador',
    receiptNumber: 'REC-00101',
  },
  {
    id: 'pay_2',
    customerId: 'cust_3',
    customerName: 'Prof. Carlos Mendoza',
    amount: 450,
    date: '2026-09-20T14:15:00Z',
    paymentMethod: 'transferencia',
    previousBalance: 450,
    newBalance: 0,
    notes: 'Pago total cuenta saldada',
    receiptNumber: 'REC-00099',
  },
];

// Helper to get from local storage or initialize
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return defaultValue;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
}

export const StorageService = {
  getCustomers: (): Customer[] => loadFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS),
  saveCustomers: (custs: Customer[]) => saveToStorage(STORAGE_KEYS.CUSTOMERS, custs),

  getReceipts: (): Receipt[] => loadFromStorage(STORAGE_KEYS.RECEIPTS, INITIAL_RECEIPTS),
  saveReceipts: (recs: Receipt[]) => saveToStorage(STORAGE_KEYS.RECEIPTS, recs),

  getPayments: (): PaymentRecord[] => loadFromStorage(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS),
  savePayments: (pays: PaymentRecord[]) => saveToStorage(STORAGE_KEYS.PAYMENTS, pays),

  getSettings: (): BusinessSettings => loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  saveSettings: (sett: BusinessSettings) => saveToStorage(STORAGE_KEYS.SETTINGS, sett),

  // Generates next incremental receipt code
  getNextReceiptNumber: (existingReceipts: Receipt[]): string => {
    let max = 100;
    for (const r of existingReceipts) {
      const match = r.receiptNumber.match(/REC-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `REC-${String(max + 1).padStart(5, '0')}`;
  },
};
