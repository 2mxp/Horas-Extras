// src/app/components/ProjectEditModal.tsx
import React, { useState, useEffect, ChangeEvent } from 'react';

interface ProjectEditModalProps {
  project: {
    id: string;
    name: string;
    restDays: number[];
    weeklyOvertimeLimit: number;
    dailyOvertimeLimit: number;
    hourlyRate: number;
  } | null;
  onSave: (projectId: string, updatedData: any) => void;
  onCancel: () => void;
}

const ProjectEditModal: React.FC<ProjectEditModalProps> = ({ project, onSave, onCancel }) => {
  const [editedName, setEditedName] = useState('');
  const [editedRestDays, setEditedRestDays] = useState<number[]>([]);
  const [editedWeeklyOvertimeLimit, setEditedWeeklyOvertimeLimit] = useState(0);
  const [editedDailyOvertimeLimit, setEditedDailyOvertimeLimit] = useState(0);
  const [editedHourlyRate, setEditedHourlyRate] = useState(0);

  useEffect(() => {
    // Populate form fields when project prop changes
    if (project) {
      setEditedName(project.name);
    } else {
      setEditedName('');
    }
  }, [project]);

  if (!project) {
    return null; // Don't render if no project is being edited
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
    setEditedWeeklyOvertimeLimit(parseFloat(e.target.value));
  };

  const handleDailyLimitChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditedDailyOvertimeLimit(parseFloat(e.target.value));
  };

  const handleHourlyRateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEditedHourlyRate(parseFloat(e.target.value));
  };

  const handleSave = () => {
    if (editedName.trim() && project) {
      const updatedData = {
        name: editedName.trim(),
        restDays: editedRestDays,
        weeklyOvertimeLimit: editedWeeklyOvertimeLimit,
        dailyOvertimeLimit: editedDailyOvertimeLimit,
        hourlyRate: editedHourlyRate,
      };
      onSave(project.id, updatedData);
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
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
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