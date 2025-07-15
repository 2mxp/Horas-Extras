// src/app/page.tsx
'use client';

import { collection, getDocs, addDoc, query, where, writeBatch, deleteDoc, doc, getDoc, limit, updateDoc } from 'firebase/firestore';
import { useState, useEffect, ChangeEvent } from 'react';
import { db } from './lib/firebase';
import { useRouter } from 'next/navigation';
import { auth } from './lib/firebase';
import { Project, Trabajador, addTrabajador, getTrabajadoresByCompany } from './lib/projectService';
import * as XLSX from 'xlsx';
import ProjectEditModal from './components/ProjectEditModal';

const BATCH_SIZE = 500;

export default function Dashboard() {
  const [selectedProject, setSelectedProject] = useState('');
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [errorLoadingProjects, setErrorLoadingProjects] = useState<string | null>(null);
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
  const router = useRouter();
  const [fileData, setFileData] = useState<any[]>([]);
  const [lastLoadedFileName, setLastLoadedFileName] = useState('');
  const [hoursData, setHoursData] = useState<any[]>([]);
  const [selectedWorkerForAbsence, setSelectedWorkerForAbsence] = useState('');
  const [absenceDate, setAbsenceDate] = useState('');
  const [absenceType, setAbsenceType] = useState('');
  const [absenceDescription, setAbsenceDescription] = useState('');
  const [newTrabajadorNombre, setNewTrabajadorNombre] = useState('');
  const [newTrabajadorCedula, setNewTrabajadorCedula] = useState('');
  const [newTrabajadorEstado, setNewTrabajadorEstado] = useState('');
  const [trabajadoresList, setTrabajadoresList] = useState<Trabajador[]>([]);

  // Formatea la fecha dd/mm/yyyy
  const formatDateToDDMMYYYY = (date: Date) => {
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Eliminar colección en lotes 
  const deleteCollection = (collectionRef: any, batchSize: number) => {
    return new Promise<void>((resolve, reject) => {
      deleteQueryBatch(db, collectionRef, batchSize, resolve, reject);
    });
  };

  async function deleteQueryBatch(db: any, collectionRef: any, batchSize: number, resolve: any, reject: any) {
    const q = query(collectionRef, limit(batchSize));
    const snapshot = await getDocs(q);

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));

    try {
      await batch.commit();
    } catch (error) {
      reject(error);
      return;
    }

    process.nextTick(() => {
      deleteQueryBatch(db, collectionRef, batchSize, resolve, reject);
    });
  }

  // Traer trabajadores
  const fetchTrabajadores = async () => {
    try {
      const companyId = 'company1';
      const workers = await getTrabajadoresByCompany(companyId);
      setTrabajadoresList(workers);
    } catch (error) {
      console.error('Error fetching trabajadores:', error);
    }
  };

  // Agregar trabajador
  const handleAddTrabajador = async () => {
    if (!newTrabajadorNombre.trim() || !newTrabajadorCedula.trim()) {
      alert("Nombre y Cédula son requeridos");
      return;
    }
    try {
      const companyId = 'company1';
      await addTrabajador(companyId, { nombre: newTrabajadorNombre, cedula: newTrabajadorCedula, estado: newTrabajadorEstado });
      setNewTrabajadorNombre('');
      setNewTrabajadorCedula('');
      setNewTrabajadorEstado('');
      fetchTrabajadores();
    } catch (error) {
      console.error('Error adding trabajador:', error);
    }
  };

  // Estado de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) setIsAuthenticated(true);
      else {
        setIsAuthenticated(false);
        router.push('/auth');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Obtener proyectos
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      setErrorLoadingProjects(null);
      const companyId = 'company1';
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const snapshot = await getDocs(projectsRef);
      const projects: Project[] = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name ?? 'Unnamed Project',
        createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date(),
        restDays: doc.data().restDays ?? [],
        weeklyOvertimeLimit: doc.data().weeklyOvertimeLimit ?? 8,
        dailyOvertimeLimit: doc.data().dailyOvertimeLimit ?? 2,
        hourlyRate: doc.data().hourlyRate ?? 5,
      }));
      setProjectList(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrorLoadingProjects('Error al cargar proyectos.');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Obtener datos de horas con filtros
  const fetchHoursData = async (projectId: string) => {
    if (!projectId) {
      setHoursData([]);
      return;
    }
    try {
      const companyId = 'company1';
      const hoursRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');
      let q = query(hoursRef);

      if (startDate) {
        const [y, m, d] = startDate.split('-').map(Number);
        const start = new Date(y, m - 1, d);
        start.setHours(0, 0, 0, 0);
        q = query(q, where('fecha', '>=', start));
      }
      if (endDate) {
        const [y, m, d] = endDate.split('-').map(Number);
        const end = new Date(y, m - 1, d);
        end.setHours(23, 59, 59, 999);
        q = query(q, where('fecha', '<=', end));
      }
      if (filterByName.trim()) q = query(q, where('nombreTrabajador', '==', filterByName.trim()));
      if (filterByCedula.trim()) q = query(q, where('cedula', '==', filterByCedula.trim()));

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        let fechaVal = null;
        if (docData.fecha && docData.fecha.seconds !== undefined) {
          fechaVal = new Date(docData.fecha.seconds * 1000);
        }
        return { id: doc.id, fecha: fechaVal, ...docData };
      });
      setHoursData(data);
    } catch (error) {
      console.error('Error fetching hours data:', error);
    }
  };

  // Obtener horas y proyectos relacionados
  const fetchProjectAndHours = async () => {
    if (!selectedProject) {
      setHoursData([]);
      return;
    }
    try {
      const companyId = 'company1';
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const projectDocRef = doc(projectsRef, selectedProject);
      const projectDocSnap = await getDoc(projectDocRef);
      if (projectDocSnap.exists()) fetchHoursData(projectDocSnap.id);
      else setHoursData([]);
    } catch {
      setHoursData([]);
    }
  };

  const handleApplyFilters = () => fetchProjectAndHours();

  // Eliminar registros por rango de fechas
  const handleDeleteRecordsByDateRange = async () => {
    if (!selectedProject) {
      alert('Selecciona un proyecto.');
      return;
    }
    if (!startDate || !endDate) {
      alert('Selecciona fecha inicio y fin.');
      return;
    }
    if (!confirm(`Eliminar registros del proyecto "${selectedProject}" entre ${startDate} y ${endDate}?`)) return;
    try {
      const companyId = 'company1';
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const projectDocRef = doc(projectsRef, selectedProject);
      const projectDocSnap = await getDoc(projectDocRef);
      if (!projectDocSnap.exists()) {
        alert('Proyecto no encontrado.');
        return;
      }
      const projectId = projectDocSnap.id;
      const hoursRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd); start.setHours(0,0,0,0);
      const end = new Date(ey, em - 1, ed); end.setHours(23,59,59,999);
      const q = query(hoursRef, where('fecha', '>=', start), where('fecha', '<=', end));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        alert('No hay registros en este rango.');
        return;
      }
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      alert(`Eliminados ${snapshot.docs.length} registros.`);
      setStartDate('');
      setEndDate('');
      fetchHoursData(projectId);
    } catch {
      alert('Error eliminando registros.');
    }
  };

  // Crear proyecto
  const handleCreateProjectFirebase = async () => {
    if (!newProjectName.trim()) {
      alert('Ingresa nombre del proyecto.');
      return;
    }
    setIsCreatingProject(true);
    try {
      const companyId = 'company1';
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const q = query(projectsRef, where('name', '==', newProjectName.trim()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        alert('Nombre de proyecto ya existe.');
        setIsCreatingProject(false);
        return;
      }
      const docRef = await addDoc(projectsRef, {
        name: newProjectName.trim(),
        createdAt: new Date(),
        restDays: [0, 6],
        weeklyOvertimeLimit: 8,
        dailyOvertimeLimit: 2,
        hourlyRate: 5
      });
      setProjectList(prev => [...prev, {
        id: docRef.id,
        name: newProjectName.trim(),
        createdAt: new Date(),
        restDays: [0, 6],
        weeklyOvertimeLimit: 8,
        dailyOvertimeLimit: 2,
        hourlyRate: 5
      }]);
      setNewProjectName('');
      alert('Proyecto creado exitosamente');
    } catch {
      alert('Error creando proyecto');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Subir datos horas extras
  const handleUploadHoursData = async () => {
    if (!selectedProject) {
      alert('Selecciona un proyecto');
      return;
    }
    if (fileData.length === 0) {
      alert('Carga un archivo primero');
      return;
    }
    try {
      const companyId = 'company1';
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const projectDocRef = doc(projectsRef, selectedProject);
      const projectDocSnap = await getDoc(projectDocRef);
      if (!projectDocSnap.exists()) {
        alert('Proyecto no encontrado');
        return;
      }
      const projectId = projectDocSnap.id;
      const hoursRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');
      for (const record of fileData) {
        await addDoc(hoursRef, {...record, projectId});
      }
      alert('Datos subidos correctamente');
      setFileData([]);
      setLastLoadedFileName('');
      fetchHoursData(projectId);
    } catch {
      alert('Error subiendo datos');
    }
  };

  // Manejar carga de archivo excel
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setFileData([]);
      return;
    }
    const file = e.target.files[0];
    if (file.name === lastLoadedFileName) {
      alert('Archivo ya cargado');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      if (!ev.target?.result) return;
      const data = new Uint8Array(ev.target.result as ArrayBuffer);
      const workbook = XLSX.read(data, {type: "array"});
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {header:1});
      
      let headerRowIndex = -1;
      for(let i=0; i<rawData.length; i++){
        if(rawData[i][1]==="Nombre"){
          headerRowIndex = i;
          break;
        }
      }
      if(headerRowIndex===-1) {
        alert('No se encontró la fila de encabezado "Nombre"');
        setFileData([]);
        return;
      }

      const fileNameMatch = file.name.match(/^DIARIO_(.+)_(\d{8})\.xlsx$/i);
      if(!fileNameMatch) {
        alert('Formato de nombre archivo incorrecto');
        setFileData([]);
        return;
      }

      const dateStr = fileNameMatch[2];
      const y = parseInt(dateStr.substr(0,4));
      const m = parseInt(dateStr.substr(4,2)) - 1;
      const d = parseInt(dateStr.substr(6,2));
      const fileDate = new Date(y,m,d);
      if(isNaN(fileDate.getTime())){
        alert('Fecha inválida en nombre de archivo');
        setFileData([]);
        return;
      }

      const headerRow = rawData[headerRowIndex];
      const nombreCol = headerRow.indexOf("Nombre");
      const ciCol = headerRow.indexOf("C.I.");
      const hIngresoCol = headerRow.indexOf("H. Ingreso");
      const hSalidaCol = headerRow.indexOf("H. Salida");
      if([nombreCol,ciCol,hIngresoCol,hSalidaCol].some(x => x===-1)){
        alert('Columnas necesarias no encontradas');
        setFileData([]);
        return;
      }

      const processedData = [];
      for(let i=headerRowIndex+1; i<rawData.length; i++){
        const row = rawData[i];
        if(row.length <= Math.max(nombreCol,ciCol,hIngresoCol,hSalidaCol)) continue;
        const nombreTrabajador = row[nombreCol];
        const cedula = row[ciCol];
        const horaIngreso = row[hIngresoCol];
        const horaSalida = row[hSalidaCol];
        if(!nombreTrabajador || !cedula) continue;
        processedData.push({fecha: fileDate, nombreTrabajador, cedula, horaIngreso, horaSalida});
      }
      setFileData(processedData);
      setLastLoadedFileName(file.name);
    };
    reader.onerror = () => {
      alert('Error leyendo archivo');
      setFileData([]);
    };
    reader.readAsArrayBuffer(file);
  };

  // Editar proyecto
  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditModalOpen(true);
  };

  // Eliminar proyecto
  const handleDeleteProject = async (project: Project) => {
    if(!confirm(`¿Eliminar proyecto "${project.name}" y todos sus registros?`)) return;
    try {
      const companyId = 'company1';
      const hoursRef = collection(db, 'companies', companyId, 'projects', project.id, 'registrosHorasExtras');
      await deleteCollection(hoursRef, BATCH_SIZE);
      const projectDocRef = doc(db, 'companies', companyId, 'projects', project.id);
      await deleteDoc(projectDocRef);
      setProjectList(prev => prev.filter(p => p.id !== project.id));
      if(selectedProject===project.id){
        setSelectedProject('');
        setHoursData([]);
      }
      alert('Proyecto eliminado');
    } catch {
      alert('Error eliminando proyecto');
    }
  };

  // Eliminar registro individual
  const handleDeleteRecord = async (recordId: string) => {
    if(!selectedProject) {
      alert('Selecciona proyecto');
      return;
    }
    try {
      const companyId = 'company1';
      const projectsRef = collection(db, 'companies', companyId, 'projects');
      const projectDocRef = doc(projectsRef, selectedProject);
      const projectDocSnap = await getDoc(projectDocRef);
      if(!projectDocSnap.exists()) {
        alert('Proyecto no encontrado');
        return;
      }
      const projectId = projectDocSnap.id;
      const recordRef = doc(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras', recordId);
      await deleteDoc(recordRef);
      fetchHoursData(projectId);
    } catch {
      alert('Error eliminando registro');
    }
  };

  // Guardar cambios de proyecto editado
  const handleSaveProject = async (updatedProject: Project) => {
    if(!updatedProject || !updatedProject.id) {
      alert('Datos inválidos para guardar');
      return;
    }
    try {
      const companyId = 'company1';
      const projectDocRef = doc(db, 'companies', companyId, 'projects', updatedProject.id);
      const { id, ...dataToUpdate } = updatedProject;
      await updateDoc(projectDocRef, dataToUpdate);
      setProjectList(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
      alert('Proyecto actualizado');
    } catch {
      alert('Error actualizando proyecto');
    } finally {
      setIsEditModalOpen(false);
      setEditingProject(null);
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/auth');
    } catch {
      alert('Error al cerrar sesión');
    }
  };

  // Hook cargar datos al montar o por cambios de selección/autenticación
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
      fetchTrabajadores();
      if(selectedProject) fetchProjectAndHours();
    } else { setHoursData([]); }
  }, [isAuthenticated, selectedProject]);

  if(authLoading){
    return <div className="flex min-h-screen flex-col items-center justify-center p-24">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4">

      {/* Botón cerrar sesión */}
      <button onClick={handleLogout} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded absolute top-4 right-4">
        Cerrar Sesión
      </button>

      <h1 className="text-2xl font-bold mb-4">Dashboard Horas Extras</h1>

      {/* Selección proyecto */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Seleccionar Proyecto</h2>
        {loadingProjects ? <p>Cargando proyectos...</p> :
          errorLoadingProjects ? <p className="text-red-500">{errorLoadingProjects}</p> :
          projectList.length === 0 ? <p>No hay proyectos disponibles. Crea uno nuevo.</p> :
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="border rounded p-2 w-full md:w-1/2 text-gray-700"
          >
            <option value="">-- Selecciona un Proyecto --</option>
            {projectList.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        }
      </div>

      {/* Carga archivos Excel */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Cargar Datos de Horas Extras (Excel)</h2>
        <input type="file" id="file-upload" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
        <label htmlFor="file-upload" className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded cursor-pointer inline-block mb-2">
          Seleccionar archivo
        </label>
        {lastLoadedFileName && <span className="ml-2 text-gray-700">{lastLoadedFileName}</span>}
        {fileData.length>0 && (
          <>
            <p>{fileData.length} registros encontrados.</p>
            <button onClick={handleUploadHoursData} className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Subir Datos a Firebase
            </button>
          </>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Filtrar Datos de Horas Extras</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="startDate" className="block text-gray-700 mb-1">Fecha Inicio:</label>
            <input type="date" id="startDate" className="w-full border rounded p-2" value={startDate} onChange={e=>setStartDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="endDate" className="block text-gray-700 mb-1">Fecha Fin:</label>
            <input type="date" id="endDate" className="w-full border rounded p-2" value={endDate} onChange={e=>setEndDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="filterByName" className="block text-gray-700 mb-1">Filtrar por Nombre:</label>
            <input type="text" id="filterByName" className="w-full border rounded p-2" value={filterByName} onChange={e=>setFilterByName(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="filterByCedula" className="block text-gray-700 mb-1">Filtrar por C.I.:</label>
            <input type="text" id="filterByCedula" className="w-full border rounded p-2" value={filterByCedula} onChange={e=>setFilterByCedula(e.target.value)} />
          </div>
        </div>
        <button onClick={handleApplyFilters} className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mr-2">Aplicar Filtros</button>
        <button onClick={handleDeleteRecordsByDateRange} className="bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded">Eliminar Registros Filtrados</button>
      </div>

      {/* Registro de Ausencias */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Registrar Ausencia</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="absenceWorker" className="block text-gray-700 mb-1">Trabajador:</label>
            <select id="absenceWorker" className="w-full border rounded p-2" value={selectedWorkerForAbsence} onChange={e=>setSelectedWorkerForAbsence(e.target.value)}>
              <option value="">-- Selecciona un Trabajador --</option>
              {trabajadoresList.map(worker => <option key={worker.id} value={worker.id}>{worker.nombre} ({worker.cedula})</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="absenceDate" className="block text-gray-700 mb-1">Fecha:</label>
            <input type="date" id="absenceDate" className="w-full border rounded p-2" value={absenceDate} onChange={e=>setAbsenceDate(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="absenceType" className="block text-gray-700 mb-1">Tipo de Ausencia:</label>
            <select id="absenceType" className="w-full border rounded p-2" value={absenceType} onChange={e=>setAbsenceType(e.target.value)}>
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
      </div>

      {/* Datos de Horas Extras */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Datos de Horas Extras del Proyecto Seleccionado</h2>
        {selectedProject ? (
          hoursData.length === 0 ? <p>No hay datos de horas extras para este proyecto.</p>
          : <div className="max-h-96 overflow-y-auto border rounded p-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Ingreso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Salida</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hoursData.map((record, idx) => (
                    <tr key={record.id || `row-${idx}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.fecha ? formatDateToDDMMYYYY(new Date(record.fecha)) : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.nombreTrabajador}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.cedula}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.horaIngreso}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.horaSalida}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded" onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        ) : (
          <p>Selecciona un proyecto para ver los datos de horas extras.</p>
        )}
      </div>

      {/* Gestión Proyectos */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Gestión de Proyectos/Fincas</h2>
        <div className="mb-4">
          <label htmlFor="new-project-name" className="block text-gray-700 font-bold mb-2">Nombre del Nuevo Proyecto:</label>
          <input type="text" id="new-project-name" value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} disabled={isCreatingProject} className="shadow border rounded w-full py-2 px-3 text-gray-700"/>
        </div>
        <button onClick={handleCreateProjectFirebase} disabled={isCreatingProject} className={`bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mr-2 ${isCreatingProject ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {isCreatingProject ? 'Guardando...' : 'Guardar Nuevo Proyecto'}
        </button>
        <button onClick={() => alert('Funcionalidad Crear Nuevo Proyecto pendiente')} className="bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded">
          Crear Nuevo Proyecto
        </button>

        {loadingProjects && <p>Cargando proyectos para gestionar...</p>}
        {errorLoadingProjects && <p className="text-red-500">{errorLoadingProjects}</p>}

        {!loadingProjects && !errorLoadingProjects && (
          <ul>
            {projectList.length === 0 ? <li>No hay proyectos creados.</li> : 
            projectList.map(project => (
              <li key={project.id} className="flex justify-between items-center border-b py-2">
                <span>{project.name}</span>
                <div className="flex space-x-2">
                  <button className="bg-yellow-500 hover:bg-yellow-700 text-white py-1 px-2 rounded text-sm" onClick={() => handleEditProject(project)}>Editar</button>
                  <button className="bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded text-sm" onClick={() => handleDeleteProject(project)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Edición */}
      {isEditModalOpen && editingProject && (
        <ProjectEditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} project={editingProject} onSave={handleSaveProject} />
      )}

      {/* Gestión Trabajadores */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Prueba de Gestión de Trabajadores (Temporal)</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorNombre" className="block text-gray-700 mb-2">Nombre:</label>
            <input id="trabajadorNombre" type="text" value={newTrabajadorNombre} onChange={e=>setNewTrabajadorNombre(e.target.value)} className="shadow border rounded w-full py-2 px-3 text-gray-700"/>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorCedula" className="block text-gray-700 mb-2">Cédula:</label>
            <input id="trabajadorCedula" type="text" value={newTrabajadorCedula} onChange={e=>setNewTrabajadorCedula(e.target.value)} className="shadow border rounded w-full py-2 px-3 text-gray-700"/>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorEstado" className="block text-gray-700 mb-2">Estado:</label>
            <input id="trabajadorEstado" type="text" value={newTrabajadorEstado} onChange={e=>setNewTrabajadorEstado(e.target.value)} className="shadow border rounded w-full py-2 px-3 text-gray-700"/>
          </div>
        </div>
        <button onClick={handleAddTrabajador} className="bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded">Agregar Trabajador</button>
        <h3 className="text-lg font-semibold mt-4 mb-2">Lista de Trabajadores:</h3>
        {trabajadoresList.length === 0 ? <p>No hay trabajadores registrados.</p> : (
          <ul>
            {trabajadoresList.map(worker => (
              <li key={worker.id} className="border-b py-1">{worker.nombre} ({worker.cedula}) - Estado: {worker.estado}</li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}