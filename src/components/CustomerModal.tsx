import React, { useState } from 'react';
import { Customer, BusinessSettings } from '../types';
import { X, UserPlus, Save, Phone, MapPin, DollarSign, Calendar, FileText } from 'lucide-react';

interface CustomerModalProps {
  customer?: Customer | null;
  settings: BusinessSettings;
  onSave: (customer: Customer) => void;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  customer,
  settings,
  onSave,
  onClose,
}) => {
  const isEditing = Boolean(customer);
  const currency = settings.currency || 'C$';

  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '+505 ');
  const [address, setAddress] = useState(customer?.address || '');
  const [creditLimit, setCreditLimit] = useState(customer?.creditLimit?.toString() || '3000');
  const [currentBalance, setCurrentBalance] = useState(customer?.currentBalance?.toString() || '0');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [nextPaymentDueDate, setNextPaymentDueDate] = useState(
    customer?.nextPaymentDueDate?.split('T')[0] || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor escribe el nombre del cliente');
      return;
    }

    const savedCustomer: Customer = {
      id: customer?.id || 'cust_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      creditLimit: parseFloat(creditLimit) || 0,
      currentBalance: parseFloat(currentBalance) || 0,
      lastPaymentDate: customer?.lastPaymentDate || null,
      nextPaymentDueDate: nextPaymentDueDate ? `${nextPaymentDueDate}T00:00:00Z` : null,
      notes: notes.trim(),
      createdAt: customer?.createdAt || new Date().toISOString(),
    };

    onSave(savedCustomer);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEditing ? 'Editar Cliente' : 'Nuevo Cliente al Crédito'}
              </h2>
              <p className="text-xs text-slate-300">
                Lleva el control de deuda y contacto para WhatsApp
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
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nombre Completo: *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Doña Carmen Ruiz Gómez"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp / Celular:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+505 8888 8888"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-receipt text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Fecha de Cobro / Pago:
              </label>
              <input
                type="date"
                value={nextPaymentDueDate}
                onChange={(e) => setNextPaymentDueDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Dirección o Punto de Referencia:
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej. Del parque 2c al lago, casa esquinera"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Límite de Crédito ({currency}):
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="3000"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-receipt text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Saldo Inicial Debe ({currency}):
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-receipt font-bold text-rose-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Notas Internas (días de pago, observaciones):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Paga cada quincena, abona puntual por transferencia..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
