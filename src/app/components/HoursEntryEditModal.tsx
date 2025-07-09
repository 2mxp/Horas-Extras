// src/app/components/HoursEntryEditModal.tsx
import { useState, useEffect, ChangeEvent } from 'react';

interface HoursEntry {
  id?: string;
  fecha: string;
  nombreTrabajador: string;
  cedula: string;
  horaIngreso: string;
  horaSalida: string;
  projectId?: string;
  // Add other potential fields
}

interface HoursEntryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit: HoursEntry | null;
  onSave: (updatedEntry: HoursEntry) => void;
}

// Helper function to validate time format (basic HH:MM or HH:MM AM/PM)
const isValidTime = (time: string): boolean => {
  if (!time) return false;
  const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$|^((0[1-9]|1[0-2]):[0-5][0-9] (AM|PM))$/i;
  return timeRegex.test(time);
};

// Helper function to validate date format (basic YYYY-MM-DD) - adjust regex based on expected format
const isValidDate = (dateString: string): boolean => {
  if (!dateString) return false;
  // Simple regex for YYYY-MM-DD, adjust if needed for other formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};


export default function HoursEntryEditModal({ isOpen, onClose, entryToEdit, onSave }: HoursEntryEditModalProps) {
  const [editedEntry, setEditedEntry] = useState<HoursEntry | null>(entryToEdit);
  const [errors, setErrors] = useState({
    fecha: '',
    horaIngreso: '',
    horaSalida: '',
  });

  useEffect(() => {
    setEditedEntry(entryToEdit);
    // Reset errors when modal opens for a new entry
    setErrors({ fecha: '', horaIngreso: '', horaSalida: '' });
  }, [entryToEdit]);

  if (!isOpen || !editedEntry) {
    return null;
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedEntry(prev => (prev ? { ...prev, [name]: value } : null));

    // Clear error for the field being edited as user types
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    let valid = true;
    const newErrors = { fecha: '', horaIngreso: '', horaSalida: '' };

    if (!editedEntry?.fecha || !isValidDate(editedEntry.fecha)) {
      newErrors.fecha = 'Formato de fecha inválido (YYYY-MM-DD)';
      valid = false;
    }
    if (!editedEntry?.horaIngreso || !isValidTime(editedEntry.horaIngreso)) {
      newErrors.horaIngreso = 'Formato de hora de ingreso inválido (HH:MM o HH:MM AM/PM)';
      valid = false;
    }
    if (!editedEntry?.horaSalida || !isValidTime(editedEntry.horaSalida)) {
      newErrors.horaSalida = 'Formato de hora de salida inválido (HH:MM o HH:MM AM/PM)';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };


  const handleSave = () => {
    if (validateForm() && editedEntry) {
      onSave(editedEntry);
      onClose();
    } else {
      alert('Por favor, corrige los errores antes de guardar.');
    }
  };

  // Check if form is valid to enable Save button
  const isFormValid = !errors.fecha && !errors.horaIngreso && !errors.horaSalida && editedEntry?.fecha && editedEntry?.horaIngreso && editedEntry?.horaSalida;



  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">Editar Registro de Horas Extras</h2>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fecha">
            Fecha:
          </label>
          <input
            type="text" // Use text input for flexible date format, or "date" for a picker
            id="fecha"
            name="fecha"
            value={editedEntry.fecha}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.fecha ? 'border-red-500' : ''}`}
          />
          {errors.fecha && <p className="text-red-500 text-xs italic">{errors.fecha}</p>}
        </div>
        {/* Optional: Allow editing worker name/cedula - add validation if needed */}
        {/*
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nombreTrabajador">
            Nombre Trabajador:
          </label>
          <input
            type="text"
            id="nombreTrabajador"
            name="nombreTrabajador"
            value={editedEntry.nombreTrabajador}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="cedula">
            Cédula:
          </label>
          <input
            type="text"
            id="cedula"
            name="cedula"
            value={editedEntry.cedula}
            onChange={handleInputChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>
        */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="horaIngreso">
            Hora Ingreso:
          </label>
          <input
            type="text" // Use text input for manual time entry, or time for picker
            id="horaIngreso"
            name="horaIngreso"
            value={editedEntry.horaIngreso}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.horaIngreso ? 'border-red-500' : ''}`}
          />
          {errors.horaIngreso && <p className="text-red-500 text-xs italic">{errors.horaIngreso}</p>}
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="horaSalida">
            Hora Salida:
          </label>
          <input
            type="text" // Use text input for manual time entry, or time for picker
            id="horaSalida"
            name="horaSalida"
            value={editedEntry.horaSalida}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${errors.horaSalida ? 'border-red-500' : ''}`}
          />
          {errors.horaSalida && <p className="text-red-500 text-xs italic">{errors.horaSalida}</p>}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={handleSave}
            className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!isFormValid}
          >
            Guardar Cambios
          </button>
          <button
            onClick={onClose}
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}