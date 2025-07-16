// src/app/page.tsx
'use client';

import {
  collection, getDocs, addDoc, query, where, writeBatch, deleteDoc,
  doc, getDoc, limit, updateDoc
} from 'firebase/firestore';
import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { db } from './lib/firebase';
import { useRouter } from 'next/navigation';
import { auth } from './lib/firebase';
import {
  Project, Trabajador, addTrabajador, getTrabajadoresByCompany
} from './lib/projectService';
import * as XLSX from 'xlsx';
import ProjectEditModal from './components/ProjectEditModal';

const BATCH_SIZE = 500;

// Definimos la plantilla para nuestros registros de horas
interface HourRecord {
  id: string;
  fecha: Date | null;
  nombreTrabajador?: string;
  cedula?: string | number;
  horaIngreso?: string;
  horaSalida?: string;
}

export default function Dashboard() {

  const router = useRouter();

  const [selectedProject, setSelectedProject] = useState('');
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [errorLoadingProjects, setErrorLoadingProjects] = useState<string|null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterByName, setFilterByName] = useState('');
  const [filterByCedula, setFilterByCedula] = useState('');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [fileData, setFileData] = useState<any[]>([]);
  const [lastLoadedFileName, setLastLoadedFileName] = useState('');
  const [hoursData, setHoursData] = useState<HourRecord[]>([]); // Usamos la nueva plantilla aquí
  const hoursTableRef = useRef<HTMLDivElement | null>(null);
  const [selectedWorkerForAbsence, setSelectedWorkerForAbsence] = useState('');
  const [absenceDate, setAbsenceDate] = useState('');
  const [absenceType, setAbsenceType] = useState('');
  const [absenceDescription, setAbsenceDescription] = useState('');

  const [newTrabajadorNombre, setNewTrabajadorNombre] = useState('');
  const [newTrabajadorCedula, setNewTrabajadorCedula] = useState('');
  const [newTrabajadorEstado, setNewTrabajadorEstado] = useState('');
  const [trabajadoresList, setTrabajadoresList] = useState<Trabajador[]>([]);

  // Formatear fecha dd/mm/yyyy
  const formatDateToDDMMYYYY = (date: Date) => {
    const d = date.getDate().toString().padStart(2,'0');
    const m = (date.getMonth()+1).toString().padStart(2,'0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const deleteCollection = async (collectionRef: any, batchSize: number) => new Promise<void>((resolve, reject) => {
      deleteQueryBatch(db, collectionRef, batchSize, resolve, reject);
    });

  async function deleteQueryBatch(db: any, collectionRef: any, batchSize: number, resolve: any, reject: any) {
    const collectionQuery = query(collectionRef, limit(batchSize));
    const snapshot = await getDocs(collectionQuery);
    if (snapshot.size === 0) { resolve(); return; }
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    try { await batch.commit(); }
    catch(e) { reject(e); return; }
    process.nextTick(() => deleteQueryBatch(db, collectionRef, batchSize, resolve, reject));
  }

  const fetchTrabajadores = async () => {
    try {
      const companyId = 'company1';
      const workers = await getTrabajadoresByCompany(companyId);
      setTrabajadoresList(workers);
    } catch(e) { console.error(e); }
  };

  const handleAddTrabajador = async () => {
    if (!newTrabajadorNombre.trim() || !newTrabajadorCedula.trim()) {
      alert('Nombre y Cédula son requeridos');
      return;
    }
    try {
      const companyId = 'company1';
      await addTrabajador(companyId, { nombre: newTrabajadorNombre, cedula: newTrabajadorCedula, estado: newTrabajadorEstado });
      setNewTrabajadorNombre(''); setNewTrabajadorCedula(''); setNewTrabajadorEstado('');
      fetchTrabajadores();
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if(user) setIsAuthenticated(true);
      else { setIsAuthenticated(false); router.push('/auth'); }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true); setErrorLoadingProjects(null);
      const companyId = 'company1';
      const projectsCollection = collection(db,'companies',companyId,'projects');
      const projectSnapshot = await getDocs(projectsCollection);
      const projects = projectSnapshot.docs.map(doc => ({
        id: doc.id, name: doc.data().name || 'Unnamed Project',
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date(),
        restDays: doc.data().restDays || [],
        weeklyOvertimeLimit: doc.data().weeklyOvertimeLimit || 8,
        dailyOvertimeLimit: doc.data().dailyOvertimeLimit || 2,
        hourlyRate: doc.data().hourlyRate || 5
      }));
      setProjectList(projects);
    } catch(e) { console.error(e); setErrorLoadingProjects('Error al cargar proyectos'); }
    finally { setLoadingProjects(false); }
  };

  const fetchHoursData = async (projectId: string) => {
    if (!projectId) {
      setHoursData([]);
      return;
    }
    try {
      const companyId = 'company1';
      const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');

      let q = query(hoursCollectionRef);
      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        const sd = new Date(y, m - 1, d);
        sd.setHours(0, 0, 0, 0);
        q = query(q, where('fecha', '>=', sd));
      }
      if (endDate) {
        const [y, m, d] = endDate.split('-').map(Number);
        const ed = new Date(y, m - 1, d);
        ed.setHours(23, 59, 59, 999);
        q = query(q, where('fecha', '<=', ed));
      }

      const snapshot = await getDocs(q);
      let records: HourRecord[] = snapshot.docs.map(doc => {
        const docData = doc.data();
        const fechaJs = docData.fecha?.toDate ? docData.fecha.toDate() : null;
        return {
          ...docData,
          id: doc.id,
          fecha: fechaJs,
        } as HourRecord;
      });

      const nameFilter = filterByName.trim().toLowerCase();
      if (nameFilter) {
        records = records.filter(r =>
          r.nombreTrabajador?.toLowerCase().includes(nameFilter)
        );
      }

      const cedulaFilter = filterByCedula.trim();
      if (cedulaFilter) {
        records = records.filter(r =>
          r.cedula?.toString().includes(cedulaFilter)
        );
      }

      setHoursData(records);

    } catch (e) {
      console.error("Error al obtener y filtrar los datos de horas:", e);
      alert("Ocurrió un error al aplicar los filtros. Revisa la consola para más detalles.");
    }
  };


  const fetchProjectAndHours = async () => {
    if(!selectedProject) { setHoursData([]); return; }
    try {
      const companyId = 'company1';
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
      const projectDocRef = doc(projectsCollectionRef, selectedProject);
      const projectDocSnap = await getDoc(projectDocRef);
      if(projectDocSnap.exists()) fetchHoursData(projectDocSnap.id);
      else setHoursData([]);
    } catch { setHoursData([]); }
  };

  const handleApplyFilters = () => fetchProjectAndHours();

  const handleClearFilters = () => {
    // 1. Limpia los campos de los filtros
    setStartDate('');
    setEndDate('');
    setFilterByName('');
    setFilterByCedula('');
    
    // 2. Recarga los datos sin filtros. Usamos un breve timeout 
    // para asegurar que el estado se actualice antes de la llamada.
    setTimeout(() => {
        fetchProjectAndHours();
    }, 0);

    // 3. Desplaza la vista suavemente a la tabla de resultados
    hoursTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};


  // Reemplaza la función existente con esta versión mejorada
const handleDeleteRecordsByDateRange = async () => {
  if (!selectedProject) {
    alert('Selecciona un proyecto');
    return;
  }
  if (!startDate || !endDate) {
    alert('Selecciona un rango de fechas para eliminar');
    return;
  }

  // Buscamos el nombre del proyecto para mostrarlo en la confirmación
  const projectToDelete = projectList.find(p => p.id === selectedProject);
  const projectName = projectToDelete ? projectToDelete.name : 'desconocido';

  if (!confirm(`¿Estás seguro de que quieres eliminar los registros del proyecto "${projectName}" entre ${startDate} y ${endDate}? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    const companyId = 'company1';
    const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', selectedProject, 'registrosHorasExtras');
    
    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const sdDate = new Date(sy, sm - 1, sd); sdDate.setHours(0, 0, 0, 0);
    const edDate = new Date(ey, em - 1, ed); edDate.setHours(23, 59, 59, 999);

    const qDelete = query(hoursCollectionRef, where('fecha', '>=', sdDate), where('fecha', '<=', edDate));
    const snapshot = await getDocs(qDelete);
    
    if (snapshot.empty) {
      alert('No se encontraron registros para eliminar en ese rango de fechas.');
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    alert(`Se eliminaron ${snapshot.docs.length} registros exitosamente.`);
    
    // Limpiamos los filtros y recargamos los datos
    handleClearFilters();

  } catch (e) {
    alert('Ocurrió un error al eliminar los registros.');
    console.error(e);
  }
};

  const handleCreateProjectFirebase = async () => {
    if (!newProjectName.trim()) {
      alert('Ingresa nombre de proyecto');
      return;
    }
    setIsCreatingProject(true);
    try {
      const companyId = 'company1';
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
      const q = query(projectsCollectionRef, where('name', '==', newProjectName.trim()));
      const snapshot = await getDocs(q);
      if(!snapshot.empty) {
        alert('El nombre del proyecto ya existe');
        setIsCreatingProject(false);
        return;
      }
      const docRef = await addDoc(projectsCollectionRef, {
        name: newProjectName.trim(),
        createdAt: new Date(),
        restDays: [0,6],
        weeklyOvertimeLimit: 8,
        dailyOvertimeLimit: 2,
        hourlyRate: 5
      });
      setProjectList(prev => [...prev, {
        id: docRef.id,
        name: newProjectName.trim(),
        createdAt: new Date(),
        restDays:[0,6],
        weeklyOvertimeLimit:8,
        dailyOvertimeLimit:2,
        hourlyRate:5
      }]);
      setNewProjectName('');
      alert('Proyecto creado!');
    } catch(e) {
      alert('Error creando proyecto');
      console.error(e);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      setFileData([]);
      return;
    }
    const file = event.target.files[0];
    if (file.name === lastLoadedFileName) {
      alert(`El archivo "${file.name}" ya ha sido cargado.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      if (!e.target?.result) return;
      const data = new Uint8Array(e.target.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      let headerRowIndex = -1;
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i].length > 1 && rawData[i][1] === 'Nombre') headerRowIndex = i;
      }
      if (headerRowIndex === -1) {
        alert('No se encontró la fila de encabezado "Nombre".');
        setFileData([]);
        return;
      }
      const fileNameMatch = file.name.match(/^DIARIO_(.+)_(\d{8})\.xlsx$/i);
      if (!fileNameMatch) {
        alert('Nombre archivo inválido.');
        setFileData([]);
        return;
      }
      const dateString = fileNameMatch[2];
      const y = parseInt(dateString.substring(0, 4), 10);
      const m = parseInt(dateString.substring(4, 6), 10) - 1;
      const d = parseInt(dateString.substring(6, 8), 10);
      const fileDate = new Date(y, m, d);
      if (isNaN(fileDate.getTime())) {
        alert('Fecha inválida en nombre archivo.');
        setFileData([]);
        return;
      }
      const headerRow = rawData[headerRowIndex];
      const nombreCol = headerRow.indexOf('Nombre');
      const ciCol = headerRow.indexOf('C.I.');
      const hIngresoCol = headerRow.indexOf('H. Ingreso');
      const hSalidaCol = headerRow.indexOf('H. Salida');
      if ([nombreCol, ciCol, hIngresoCol, hSalidaCol].some(c => c === -1)) {
        alert('Faltan columnas necesarias.');
        setFileData([]);
        return;
      }
      const processedData: any[] = [];
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (row.length <= Math.max(nombreCol, ciCol, hIngresoCol, hSalidaCol)) continue;
        const nombreTrabajador = row[nombreCol];
        const cedula = row[ciCol];
        const horaIngreso = row[hIngresoCol];
        const horaSalida = row[hSalidaCol];
        if (!nombreTrabajador || !cedula) continue;
        processedData.push({ fecha: fileDate, nombreTrabajador, cedula, horaIngreso, horaSalida });
      }
      setFileData(processedData);
      setLastLoadedFileName(file.name);
    };
    reader.onerror = () => {
      alert('Error leyendo archivo.');
      setFileData([]);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUploadHoursData = async () => {
    if (!selectedProject) {
      alert('Por favor, selecciona un proyecto antes de subir los datos.');
      return;
    }
    if (fileData.length === 0) {
      alert('No hay datos de archivo para subir.');
      return;
    }

    try {
      const companyId = 'company1'; 
      const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', selectedProject, 'registrosHorasExtras');
      
      const batch = writeBatch(db);
      fileData.forEach(record => {
        const docRef = doc(hoursCollectionRef); 
        batch.set(docRef, record);
      });

      await batch.commit();

      alert(`Se subieron ${fileData.length} registros exitosamente.`);
      setFileData([]);
      setLastLoadedFileName('');
      fetchHoursData(selectedProject); 
    } catch (error) {
      alert('Ocurrió un error al subir los datos a Firebase.');
      console.error('Error uploading hours data:', error);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`¿Eliminar proyecto "${project.name}" y todos sus registros?`)) return;

    try {
      const companyId = 'company1';
      const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', project.id, 'registrosHorasExtras');
      await deleteCollection(hoursCollectionRef, BATCH_SIZE);
      const projectDocRef = doc(db, 'companies', companyId, 'projects', project.id);
      await deleteDoc(projectDocRef);
      setProjectList(prevList => prevList.filter(p => p.id !== project.id));
      if (selectedProject === project.id) {
        setSelectedProject('');
        setHoursData([]);
      }
      alert(`Proyecto "${project.name}" eliminado.`);
    } catch (error) {
      alert('Error eliminando proyecto.');
      console.error(error);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!selectedProject) {
      alert('Selecciona un proyecto primero.');
      return;
    }
    try {
      const companyId = 'company1';
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
      const projectDocRef = doc(projectsCollectionRef, selectedProject);
      const projectDocSnap = await getDoc(projectDocRef);
      if (!projectDocSnap.exists()) {
        alert('Proyecto no encontrado.');
        return;
      }
      const projectId = projectDocSnap.id;
      const recordRef = doc(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras', recordId);
      await deleteDoc(recordRef);
      fetchHoursData(projectId);
    } catch (error) {
      alert('Error eliminando registro.');
      console.error(error);
    }
  };

  const handleSaveProject = async (updatedProject: Project) => {
    if (!updatedProject || !updatedProject.id) {
      alert('Datos inválidos para guardar.');
      return;
    }
    try {
      const companyId = 'company1';
      const projectDocRef = doc(db, 'companies', companyId, 'projects', updatedProject.id);
      const { id, ...dataToUpdate } = updatedProject;
      await updateDoc(projectDocRef, dataToUpdate);
      setProjectList(prevList => prevList.map(p => (p.id === updatedProject.id ? updatedProject : p)));
      alert(`Proyecto "${updatedProject.name}" actualizado.`);
    } catch (error) {
      alert('Error actualizando proyecto.');
      console.error(error);
    } finally {
      setIsEditModalOpen(false);
      setEditingProject(null);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/auth');
    } catch {
      alert('Error cerrando sesión.');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
      fetchTrabajadores();
      if (selectedProject) fetchProjectAndHours();
    } else {
      setHoursData([]);
    }
  }, [isAuthenticated, selectedProject]);

  if (authLoading) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4">

      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded absolute top-4 right-4"
      >
        Cerrar Sesión
      </button>

      <h1 className="text-2xl font-bold mb-4">Dashboard Horas Extras</h1>

      {/* Select proyecto */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Seleccionar Proyecto</h2>
        {loadingProjects
          ? <p>Cargando proyectos...</p>
          : errorLoadingProjects
          ? <p className="text-red-500">{errorLoadingProjects}</p>
          : projectList.length === 0
          ? <p>No hay proyectos disponibles. Crea uno nuevo.</p>
          : (
            <select
              className="border rounded p-2 w-full md:w-1/2 text-gray-700"
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
            >
              <option value="">-- Selecciona un Proyecto --</option>
              {projectList.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          )
        }
      </div>

      {/* Cargar Excel */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Cargar Datos de Horas Extras (Excel)</h2>
        <input
          id="file-upload"
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileUpload}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className="bg-blue-600 hover:bg-blue-800 text-white py-2 px-4 rounded cursor-pointer inline-block mb-2"
        >
          Seleccionar Archivo
        </label>
        {lastLoadedFileName && <span className="ml-2 text-gray-700 font-semibold">{lastLoadedFileName}</span>}
        {fileData.length > 0 && (
          <button
            onClick={handleUploadHoursData}
            className="bg-green-600 hover:bg-green-800 text-white py-2 px-4 rounded"
          >
            Subir Datos a Firebase
          </button>
        )}
      </div>

      {/* Filtros y acciones */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Filtrar Datos de Horas Extras</h2>
        <div className="flex gap-4 flex-wrap mb-4">
          <input
            type="date"
            className="border rounded p-2 flex-1 min-w-[150px]"
            placeholder="Fecha Inicio"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="border rounded p-2 flex-1 min-w-[150px]"
            placeholder="Fecha Fin"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
          <input
            type="text"
            className="border rounded p-2 flex-1 min-w-[150px]"
            placeholder="Filtrar por Nombre"
            value={filterByName}
            onChange={e => setFilterByName(e.target.value)}
          />
          <input
            type="text"
            className="border rounded p-2 flex-1 min-w-[150px]"
            placeholder="Filtrar por C.I."
            value={filterByCedula}
            onChange={e => setFilterByCedula(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
              onClick={handleApplyFilters}
              className="bg-blue-600 hover:bg-blue-800 text-white py-2 px-4 rounded"
          >
              Aplicar Filtros
          </button>
          <button
              onClick={handleClearFilters}
              className="bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
          >
              Limpiar Filtros
          </button>
          <button
              onClick={handleDeleteRecordsByDateRange}
              className="bg-red-600 hover:bg-red-800 text-white py-2 px-4 rounded"
          >
              Eliminar Registros Filtrados
          </button>
        </div>
      </div>

      {/* Registro de Ausencias */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Registrar Ausencia</h2>
        <div className="flex gap-4 flex-wrap mb-4">
        <select
            className="border rounded p-2 flex-1 min-w-[200px]"
            value={selectedWorkerForAbsence}
            onChange={e => setSelectedWorkerForAbsence(e.target.value)}
          >
            <option value="">-- Selecciona un Trabajador --</option>
            {trabajadoresList.map(w => (
              <option key={w.id} value={w.id}>{w.nombre} ({w.cedula})</option>
            ))}
          </select>

          <input
            type="date"
            className="border rounded p-2 flex-1 min-w-[200px]"
            value={absenceDate}
            onChange={e => setAbsenceDate(e.target.value)}
          />

          <select
            className="border rounded p-2 flex-1 min-w-[200px]"
            value={absenceType}
            onChange={e => setAbsenceType(e.target.value)}
          >
            <option value="">-- Selecciona un Tipo --</option>
            <option value="Vacaciones">Vacaciones</option>
            <option value="Maternidad">Maternidad</option>
            <option value="Paternidad">Paternidad</option>
            <option value="Enfermedad">Enfermedad</option>
            <option value="Justificada">Justificada</option>
            <option value="Injustificada">Injustificada</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
      </div>

      {/* Tabla horas extras*/}
      <div  className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Datos de Horas Extras del Proyecto Seleccionado</h2>
        {selectedProject ? (
          hoursData.length === 0 ? (
            <p>No hay datos de horas extras para este proyecto.</p>
          ) : (
            <div ref={hoursTableRef} className="max-h-96 overflow-y-auto border rounded p-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th>Fecha</th>
                    <th>Nombre</th>
                    <th>Cédula</th>
                    <th>Hora Ingreso</th>
                    <th>Hora Salida</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {hoursData.map((record, idx) => (
                    <tr key={record.id || `row-${idx}`}>
                      <td>{record.fecha ? formatDateToDDMMYYYY(record.fecha) : "N/A"}</td>
                      <td>{record.nombreTrabajador}</td>
                      <td>{record.cedula}</td>
                      <td>{record.horaIngreso}</td>
                      <td>{record.horaSalida}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="bg-red-600 hover:bg-red-800 text-white px-2 py-1 rounded"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p>Selecciona un proyecto para ver horas extras.</p>
        )}
      </div>

      {/* Gestión de proyectos */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Gestión de Proyectos/Fincas</h2>
        <div className="mb-4">
          <label htmlFor="new-project-name" className="block mb-2">Nombre del Nuevo Proyecto:</label>
          <input
            id="new-project-name"
            type="text"
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            disabled={isCreatingProject}
            className="w-full border rounded p-2"
          />
        </div>
        <button
          onClick={handleCreateProjectFirebase}
          disabled={isCreatingProject}
          className={`bg-blue-600 hover:bg-blue-800 text-white py-2 px-4 mr-2 rounded ${isCreatingProject ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isCreatingProject ? 'Guardando...' : 'Guardar Nuevo Proyecto'}
        </button>
        <button
          onClick={() => alert("Funcionalidad Crear Nuevo Proyecto en desarrollo")}
          className="bg-green-600 hover:bg-green-800 text-white py-2 px-4 rounded"
        >
          Crear Nuevo Proyecto
        </button>

        {loadingProjects && <p>Cargando proyectos...</p>}
        {errorLoadingProjects && <p className="text-red-600">{errorLoadingProjects}</p>}

        {!loadingProjects && !errorLoadingProjects && (
          <ul>
            {projectList.length === 0 ? (
              <li>No hay proyectos creados.</li>
            ) : (
              projectList.map(project => (
                <li key={project.id} className="flex justify-between items-center border-b py-2">
                  <span>{project.name}</span>
                  <div className="space-x-2">
                    <button className="bg-yellow-600 hover:bg-yellow-800 text-white py-1 px-2 rounded" onClick={() => handleEditProject(project)}>Editar</button>
                    <button className="bg-red-600 hover:bg-red-800 text-white py-1 px-2 rounded" onClick={() => handleDeleteProject(project)}>Eliminar</button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Modal de edición */}
      {isEditModalOpen && editingProject && (
        <ProjectEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={editingProject}
          onSave={handleSaveProject}
        />
      )}

      {/* Gestión trabajadores temporal */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Prueba de Gestión de Trabajadores (Temporal)</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorNombre" className="block mb-2">Nombre:</label>
            <input
              id="trabajadorNombre"
              type="text"
              value={newTrabajadorNombre}
              onChange={e => setNewTrabajadorNombre(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorCedula" className="block mb-2">Cédula:</label>
            <input
              id="trabajadorCedula"
              type="text"
              value={newTrabajadorCedula}
              onChange={e => setNewTrabajadorCedula(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorEstado" className="block mb-2">Estado:</label>
            <input
              id="trabajadorEstado"
              type="text"
              value={newTrabajadorEstado}
              onChange={e => setNewTrabajadorEstado(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
        </div>
        <button onClick={handleAddTrabajador} className="bg-green-600 hover:bg-green-800 text-white py-2 px-4 rounded">
          Agregar Trabajador
        </button>
        <h3 className="text-lg font-semibold mt-4 mb-2">Lista de Trabajadores:</h3>
        {trabajadoresList.length === 0 ? (
          <p>No hay trabajadores registrados.</p>
        ) : (
          <ul className="border divide-y">
            {trabajadoresList.map(worker => (
              <li key={worker.id} className="py-1">
                {worker.nombre} ({worker.cedula}) - Estado: {worker.estado}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
