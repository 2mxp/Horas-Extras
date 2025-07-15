// src/app/components/ProjectEditModal.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';
import { Project } from '../lib/projectService'; // Asegúrate de que la ruta sea correcta

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: { // Estructura del proyecto
    id: string;
    name: string;
    restDays: number[];
    weeklyOvertimeLimit: number;
    dailyOvertimeLimit: number;
    hourlyRate: number;
    createdAt?: Date; // <--- Agregar esta línea (marcado como opcional porque no siempre estará presente)
    // Añadir cualquier otra propiedad que pueda tener un Project
  } | null;
  onSave: (project: Project) => void;
}


const ProjectEditModal: React.FC<ProjectEditModalProps> = ({ isOpen, onClose, project, onSave }) => { // Modificado para desestructurar onClose
  const [editedName, setEditedName] = useState('');
  const [editedRestDays, setEditedRestDays] = useState<number[]>([]);
  const [editedWeeklyOvertimeLimit, setEditedWeeklyOvertimeLimit] = useState(0);
  const [editedDailyOvertimeLimit, setEditedDailyOvertimeLimit] = useState(0);
  const [editedHourlyRate, setEditedHourlyRate] = useState(0);

  useEffect(() => {
    // Populate form fields when project prop changes
    if (project) {
      setEditedName(project.name);
      // Asegurarse de que los valores numéricos sean manejados correctamente (evitar NaN)
      setEditedRestDays(project.restDays || []); // Usar un array vacío por defecto si es null/undefined
      setEditedWeeklyOvertimeLimit(project.weeklyOvertimeLimit || 0);
      setEditedDailyOvertimeLimit(project.dailyOvertimeLimit || 0);
      setEditedHourlyRate(project.hourlyRate || 0);
    } else {
      // Limpiar los estados si no hay proyecto
      setEditedName('');
      setEditedRestDays([]);
      setEditedWeeklyOvertimeLimit(0);
      setEditedDailyOvertimeLimit(0);
      setEditedHourlyRate(0);
    }
  }, [project]); // Se ejecuta cuando el prop 'project' cambia

  if (!isOpen) { // Usar el prop isOpen para controlar la visibilidad
    return null; // Don't render if modal is not open
  }

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleRestDaysChange = (dayIndex: number) => {
    setEditedRestDays(prev =>
      prev.includes(dayIndex) ? prev.filter(day => day !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const handleWeeklyLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditedWeeklyOvertimeLimit(parseFloat(e.target.value) || 0); // Parsear a float y usar 0 si es NaN
  };

  const handleDailyLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditedDailyOvertimeLimit(parseFloat(e.target.value) || 0); // Parsear a float y usar 0 si es NaN
  };

  const handleHourlyRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditedHourlyRate(parseFloat(e.target.value) || 0); // Parsear a float y usar 0 si es NaN
  };

  const handleSave = () => {
    if (editedName.trim() && project) {
      const updatedProject: Project = { // Crear un objeto Project completo para pasar a onSave
        id: project.id, // Mantener el ID original
        name: editedName.trim(),
        restDays: editedRestDays,
        weeklyOvertimeLimit: editedWeeklyOvertimeLimit,
        dailyOvertimeLimit: editedDailyOvertimeLimit,
        hourlyRate: editedHourlyRate,
        createdAt: project.createdAt || new Date(), // Mantener el createdAt original si existe, o usar la fecha actual si es undefined

        // Añadir cualquier otra propiedad necesaria de Project
      };
      onSave(updatedProject); // Llamar a onSave con el objeto Project completo
    } else if (!editedName.trim()) {
      alert('El nombre del proyecto no puede estar vacío.');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Editar Proyecto</h2>
        <div className="mb-4">
          <label htmlFor="edit-project-name" className="block text-gray-700 font-bold mb-2">
            Nombre del Proyecto:
          </label>
          <input
            type="text"
            id="edit-project-name"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={editedName}
            onChange={handleNameChange}
          />
        </div>

        {/* Configuration Fields */}
        <div className="mb-4">
          <label className="block text-gray-700 font-bold mb-2">Días de Descanso:</label>
          <div className="flex flex-wrap">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day, index) => (
              <label key={index} className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={editedRestDays.includes(index)}
                  onChange={() => handleRestDaysChange(index)}
                />
                <span className="ml-2 text-gray-700">{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="edit-weekly-limit" className="block text-gray-700 font-bold mb-2">
            Límite Semanal Horas Extras:
          </label>
          <input
            type="number"
            id="edit-weekly-limit"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={editedWeeklyOvertimeLimit}
            onChange={handleWeeklyLimitChange}
            min="0"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="edit-daily-limit" className="block text-gray-700 font-bold mb-2">
            Límite Diario Horas Extras:
          </label>
          <input
            type="number"
            id="edit-daily-limit"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={editedDailyOvertimeLimit}
            onChange={handleDailyLimitChange}
            min="0"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="edit-hourly-rate" className="block text-gray-700 font-bold mb-2">
            Tarifa Horaria:
          </label>
          <input type="number" id="edit-hourly-rate" className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" value={editedHourlyRate} onChange={handleHourlyRateChange} min="0" step="0.01" />
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose} // Usar onClose para cancelar
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave} // Llama a handleSave internamente
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectEditModal;
