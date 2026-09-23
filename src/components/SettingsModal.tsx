import React, { useState } from 'react';
import { BusinessSettings } from '../types';
import { X, Store, Save, Sparkles, Download, Upload, RefreshCw } from 'lucide-react';
import { StorageService } from '../utils/storage';

interface SettingsModalProps {
  settings: BusinessSettings;
  onSave: (newSettings: BusinessSettings) => void;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
  onDataRestored,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  const handleExportBackup = () => {
    const backup = {
      customers: StorageService.getCustomers(),
      receipts: StorageService.getReceipts(),
      payments: StorageService.getPayments(),
      settings: StorageService.getSettings(),
      date: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CrediFacil_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.customers && data.receipts) {
          StorageService.saveCustomers(data.customers);
          StorageService.saveReceipts(data.receipts);
          if (data.payments) StorageService.savePayments(data.payments);
          if (data.settings) {
            StorageService.saveSettings(data.settings);
            setFormData(data.settings);
          }
          alert('¡Copia de seguridad restaurada con éxito!');
          if (onDataRestored) onDataRestored();
        } else {
          alert('El archivo no contiene un formato de respaldo válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Personalizar Plantilla y Negocio</h2>
              <p className="text-xs text-slate-300">
                Aparecerá en los recibos impresos y enviados por WhatsApp
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Nombre del Negocio o Tienda:
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Ej. Abarrotes & Pulpería San José"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="w-20">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Icono:
              </label>
              <select
                value={formData.logoEmoji}
                onChange={(e) => setFormData({ ...formData, logoEmoji: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg text-center outline-none"
              >
                <option value="🏪">🏪</option>
                <option value="🛒">🛒</option>
                <option value="🥖">🥖</option>
                <option value="🍎">🍎</option>
                <option value="🥩">🥩</option>
                <option value="🌾">🌾</option>
                <option value="📦">📦</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Propietario / Encargado:
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="Ej. Doña Gloria Martínez"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Teléfono / WhatsApp:
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+505 8899 4422"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-receipt text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Dirección o Barrio:
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej. Managua, semáforos 2c al sur..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                RUC / No. Registro (Opcional):
              </label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="RUC 001-150882-0003K"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono-receipt text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Símbolo de Moneda:
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="C$">C$ (Córdobas - Nicaragua)</option>
                <option value="$">$ (Dólares USD)</option>
                <option value="Q">Q (Quetzales - Guatemala)</option>
                <option value="L">L (Lempiras - Honduras)</option>
                <option value="₡">₡ (Colones - Costa Rica)</option>
                <option value="Bs.">Bs. (Bolivianos / Bs)</option>
                <option value="RD$">RD$ (Rep. Dominicana)</option>
                <option value="S/">S/ (Soles - Perú)</option>
                <option value="€">€ (Euros)</option>
              </select>
            </div>
          </div>

          {/* Plantilla Mensajes */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 block flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Mensajes de la Plantilla de Recibo
            </span>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Mensaje de agradecimiento (visible en WhatsApp y recibo):
              </label>
              <input
                type="text"
                value={formData.customMessage}
                onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                placeholder="¡Gracias por su preferencia! Cuentas claras conservan amistades."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Pie de página o condición:
              </label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                placeholder="Recuerde reportar su abono enviando foto del comprobante."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Backup / Export */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Copia de Seguridad y Datos
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Respaldo JSON
              </button>

              <label className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Restaurar Respaldo
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>

          {/* Save button */}
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
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccess ? '¡Guardado!' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
