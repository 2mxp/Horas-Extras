// src/app/page.tsx
'use client';

import { deleteDoc, doc } from 'firebase/firestore';
import { useState, useEffect, ChangeEvent } from 'react';
import { db } from './lib/firebase'; // Import the initialized Firestore instance
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation'; // Importa useRouter
import { auth } from './lib/firebase'; // Importa la instancia de auth
import * as XLSX from 'xlsx'; // Importa la librería xlsx

export default function Dashboard() {
   const [selectedProject, setSelectedProject] = useState('');
   const [projectList, setProjectList] = useState<string[]>([]);
   const [loadingProjects, setLoadingProjects] = useState(true); // New state for loading indicator
   const [errorLoadingProjects, setErrorLoadingProjects] = useState<string | null>(null); // New state for error handling
   const [newProjectName, setNewProjectName] = useState(''); // Estado para el nombre del nuevo proyecto
   const [isCreatingProject, setIsCreatingProject] = useState(false); // Estado para indicar si se está creando un proyecto

  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado para el estado de autenticación
  const [authLoading, setAuthLoading] = useState(true); // Estado para el estado de carga de autenticación
  const router = useRouter(); // Instancia del router
  const [fileData, setFileData] = useState<any[]>([]); // New state to store processed Excel data
  const [lastLoadedFileName, setLastLoadedFileName] = useState(''); // New state to store the name of the last loaded file
  const [hoursData, setHoursData] = useState<any[]>([]); // New state to store fetched hours data

  console.log('Componente Dashboard renderizado'); // Console log de renderización

  // Hook para verificar el estado de autenticación
  useEffect(() => {
    console.log('useEffect de autenticación ejecutado'); // Nuevo log
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('auth.onAuthStateChanged listener activado'); // Nuevo log
      if (user) {
        console.log('Usuario autenticado detectado en listener'); // Nuevo log
        setIsAuthenticated(true);
        console.log('Estado isAuthenticated actualizado a true'); // Nuevo log
      } else {
        console.log('Usuario NO autenticado detectado en listener'); // Nuevo log
        setIsAuthenticated(false); // Asegúrate de establecerlo a false si no hay usuario
        router.push('/auth'); // Redirige al usuario no autenticado a la página de inicio de sesión
        console.log('Estado isAuthenticated actualizado a false, redirigiendo a /auth'); // Nuevo log
      }
      setAuthLoading(false);
      console.log('Estado authLoading actualizado a false'); // Nuevo log
    });

    console.log('Suscripción onAuthStateChanged establecida'); // Nuevo log

    return () => {
      console.log('Limpiando suscripción onAuthStateChanged'); // Nuevo log
      unsubscribe(); // Limpia el listener al desmontar el componente
    };

  }, [router]);

  // Function to fetch hours data for the selected project from Firestore
  const fetchHoursData = async (projectId: string) => {
    if (!projectId) {
      setHoursData([]); // Clear hours data if no project is selected
      return;
    }
    console.log(`Fetching hours data for project ID: ${projectId}`);
    try {
      const companyId = 'company1'; // TODO: Replace with dynamic company ID
      const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');

      const querySnapshot = await getDocs(hoursCollectionRef);

      const data = querySnapshot.docs.map(doc => ({ // Map documents including their IDs
        id: doc.id,
        ...doc.data() as {
          fecha: string; nombreTrabajador: string; cedula: string;
          horaIngreso: string; horaSalida: string; projectId: string;
        } // Explicitly type the data
      }));

      setHoursData(data);
      console.log(`Fetched ${data.length} hours records.`);

    } catch (error) {
      console.error('Error fetching hours data:', error);
    }
  };

  // Function to delete a specific hours entry from Firestore
  const handleDeleteRecord = async (recordId: string) => {
    if (!selectedProject) {
      alert('No se ha seleccionado un proyecto.');
      return;
    }

    try {
      const companyId = 'company1'; // TODO: Replace with dynamic company ID
      // Find the projectId based on the selectedProject name
      // Assuming you have a way to get the project ID from the name,
      // or you store the project ID along with the selectedProject name in state.
      // For now, we'll refetch the project ID based on the name, which is not ideal
      // if you have a large number of projects. A better approach is to store
      // the selected project's ID directly.
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
      const q = query(projectsCollectionRef, where("name", "==", selectedProject));
      const querySnapshot = await getDocs(q);
      const projectDoc = querySnapshot.docs[0];
      const projectId = projectDoc.id;

      const recordRef = doc(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras', recordId);
      await deleteDoc(recordRef);
      alert('Registro eliminado con éxito!');
      setHoursData(prevHoursData => prevHoursData.filter(record => record.id !== recordId)); // Update local state
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error al eliminar el registro. Inténtalo de nuevo.');
    }
  };

  // Function to delete a specific hours entry from Firestore
  const handleDeleteHoursEntry = async (entryId: string) => {
    if (!selectedProject) {
      alert('No se ha seleccionado un proyecto.');
      return;
    }

    try {
      const companyId = 'company1'; // TODO: Replace with dynamic company ID
      // Fetch the projectId based on the selectedProject name
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
      const q = query(projectsCollectionRef, where("name", "==", selectedProject));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert(`Error: No se encontró el proyecto "${selectedProject}" en la base de datos.`);
        return;
      }

      const projectDoc = querySnapshot.docs[0];
      const projectId = projectDoc.id;

      const entryRef = doc(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras', entryId);
      await deleteDoc(entryRef);
      alert('Registro eliminado con éxito!');
      fetchHoursData(projectId); // Refresh the displayed data
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('Error al eliminar el registro. Inténtalo de nuevo.');
    }
  };

  // Definición de fetchProjects fuera de useEffect
  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      setErrorLoadingProjects(null);
      const companyId = 'company1'; // TODO: Replace with dynamic company ID after authentication implementation
      const projectsCollection = collection(db, `companies/${companyId}/projects`);

      console.log('Intentando leer de Firestore:', `companies/${companyId}/projects`); // Console log antes de leer

      const projectSnapshot = await getDocs(projectsCollection);

      console.log('Snapshot recibido:', projectSnapshot); // **Nuevo log**

      console.log('Datos recibidos de Firestore (antes de mapear):', projectSnapshot.docs.map(doc => doc.data())); // Nuevo log

      const projects = projectSnapshot.docs
        .map(doc => doc.data()) // Obtener los datos de cada documento
        .filter(data => data && data.name) // Filtrar documentos que no tienen data o campo name
        .map(data => data.name); // Extraer el nombre

      setProjectList(projects);
      console.log('Proyectos establecidos en el estado:', projects); // **Nuevo log**

    } catch (error) {
      console.error('Error fetching projects:', error);
      setErrorLoadingProjects('Error al cargar proyectos.');
    } finally {
      setLoadingProjects(false);
      console.log('fetchProjects terminado.'); // Console log al finalizar
    }
  };
 
  useEffect(() => {
    console.log('useEffect ejecutado, llamando a fetchProjects'); // Console log dentro del useEffect
    // Verifica que isAuthenticated sea verdadero antes de llamar a fetchProjects
    if (isAuthenticated) {
      console.log('Usuario autenticado, llamando a fetchProjects');
      fetchProjects();
    } else {
      console.log('Usuario no autenticado, no se llama a fetchProjects');
 }
    // Fetch hours data when the selected project changes
 if (isAuthenticated && selectedProject) {
 fetchHoursData(selectedProject);
 }
  }, [isAuthenticated, selectedProject]); // Agrega isAuthenticated y selectedProject como dependencias

  // Función para crear un nuevo proyecto en Firestore con verificación de duplicados
  const handleCreateProjectFirebase = async () => {
    console.log("Iniciando handleCreateProjectFirebase"); // Este console.log debería aparecer

    if (!newProjectName.trim()) {
      alert('Por favor, ingresa un nombre para el proyecto.');
      return;
    }

    setIsCreatingProject(true); // Indicamos que la creación está en progreso

    try {
      const companyId = 'company1'; // TODO: Reemplazar con dynamic company ID after authentication implementation
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');

      // --- Inicio de la lógica de verificación de duplicados ---
      const q = query(projectsCollectionRef, where("name", "==", newProjectName.trim())); // Añade .trim() para evitar espacios extra
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Si el snapshot no está vacío, significa que ya existe un documento con ese nombre
        alert('Ya existe un proyecto con este nombre. Por favor, elige otro.');
        setIsCreatingProject(false); // Asegúrate de resetear el estado de creación
        return; // <--- Esto debería detener la ejecución
      }
      // --- Fin de la lógica de verificación de duplicados ---

      // Si no se encontraron duplicados, proceder a añadir el documento
      const docRef = await addDoc(projectsCollectionRef, {
        name: newProjectName.trim(), // Guarda el nombre sin espacios extra
        createdAt: new Date() // Opcional: añadir una marca de tiempo
        // Otros campos del proyecto si los tienes
      });

      console.log('Proyecto creado con ID:', docRef.id);
      alert('Proyecto creado con éxito!');

      setNewProjectName(''); // Limpiar el input después de crear
      // En lugar de fetchProjects(), actualiza el estado local para ver el cambio inmediatamente:
      // fetchProjects(); // Comenta o elimina esta línea si quieres actualización inmediata
      // Para actualización inmediata (opción 1 mencionada antes):
      setProjectList(prevList => [...prevList, newProjectName.trim()]);


    } catch (error) {
      console.error('Error al crear proyecto:', error);
      alert('Error al crear proyecto. Inténtalo de nuevo.');
    } finally {
      setIsCreatingProject(false); // La creación ha terminado
    }
  };

  // Función para manejar la carga de datos de horas extras a Firebase
  const handleUploadHoursData = async () => {
    console.log('Iniciando subida de datos de horas extras a Firebase.'); // Log al inicio

    if (!selectedProject) {
      alert('Por favor, selecciona un proyecto antes de subir los datos.');
      return;
  }

  if (fileData.length === 0) {
    alert('No hay datos para subir. Carga un archivo Excel primero.');
    return;
  }

  // TODO: Añadir estado de carga para la subida
  // setIsUploading(true);

  try {
    const companyId = 'company1'; // TODO: Reemplazar con dynamic company ID
    // Buscar el ID del documento del proyecto seleccionado
    const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
    const q = query(projectsCollectionRef, where("name", "==", selectedProject));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert(`Error: No se encontró el proyecto "${selectedProject}" en la base de datos.`);
      // TODO: Resetear estado de carga
      // setIsUploading(false);
      return;
    }

    // Asumimos que solo habrá un proyecto con ese nombre para esta compañía
    const projectDoc = querySnapshot.docs[0];
    const projectId = projectDoc.id;
    console.log(`Subiendo datos al proyecto con ID: ${projectId}`); // Log del ID del proyecto

    // Referencia a la subcolección de horas extras dentro del proyecto
    const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');

    // Subir cada registro de horas extras como un documento
    for (const record of fileData) {
      // Añadir el projectoId a cada registro
      const recordToUpload = { ...record, projectId: projectId };
      await addDoc(hoursCollectionRef, recordToUpload);
      console.log('Registro subido:', recordToUpload); // Log por cada registro subido
    }

    alert('Datos de horas extras subidos con éxito.');
    setFileData([]); // Limpiar los datos después de una subida exitosa

 fetchHoursData(projectId); // Refresh hours data after successful upload
  } catch (error) {
    console.error('Error al subir datos de horas extras:', error);
    alert('Error al subir datos de horas extras. Inténtalo de nuevo.');
  } finally {
    // TODO: Resetear estado de carga
    // setIsUploading(false);
    console.log('handleUploadHoursData terminado.'); // Log al finalizar
  }
};

const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
  console.log('Función handleFileUpload llamada.'); // Log al inicio
  const files = event.target.files;
  if (files && files[0]) {
    const file = files[0];
    const reader = new FileReader();

    // Check if the file name is the same as the last loaded file
    if (file.name === lastLoadedFileName) {
      alert(`El archivo "${file.name}" ya ha sido cargado.`);
      return; // Stop processing if it's a duplicate
    }

    reader.onload = (e) => {
      if (e.target && e.target.result) {
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Asumiendo que quieres leer la primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convertir la hoja a un array de arrays (cada array es una fila)
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Datos brutos del archivo Excel leídos (array de arrays):', rawData); // Log para ver los datos leídos en formato crudo

        // --- Lógica de procesamiento con array de arrays ---
        let headerRowIndex = -1;
        let fileDate: string | null = null;
        const processedData: any[] = [];

        // Buscar la fila de encabezado y la fecha en el array de arrays
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            console.log(`Revisando fila ${i}:`, row); // Log para depuración

            // Buscar la fila que contiene el encabezado de columnas (Ej: Nombre, C.I., H. Ingreso)
            // Buscar la fila donde la segunda columna (índice 1) sea "Nombre"
             if (row.length > 1 && row[1] === 'Nombre') {
                 headerRowIndex = i;
                 console.log(`Encabezado de columnas encontrado en la fila ${i}`); // Log cuando se encuentra
             }
             // Buscar la fila que contiene la fecha (Ej: "Fecha: 02 de Julio de 2025")
            // Buscar en la segunda columna (índice 1) si contiene la cadena "Fecha:"
             if (row.length > 1 && typeof row[1] === 'string' && row[1].includes('Fecha:')) {
                 // Extraer la fecha de la cadena
                 // Buscar la parte que comienza con "Fecha:" y extraerla
                 const fechaMatch = row[1].match(/Fecha:\s*(.*)/);
                 if (fechaMatch && fechaMatch[1]) {
                     fileDate = fechaMatch[1].trim();
                     console.log(`Fecha encontrada: ${fileDate} en la fila ${i}`); // Log cuando se encuentra
                 }
             }

             // Ahora esperamos encontrar AMBOS en diferentes filas
             // Puedes decidir si sales del bucle una vez que encuentras ambos
             // if (headerRowIndex !== -1 && fileDate !== null) {
             //   break;
             // }
        }

        // Después del bucle, verificamos si encontramos ambos
         if (headerRowIndex === -1) {
             alert('No se encontró la fila de encabezado con "Nombre". Asegúrate de que el formato sea correcto.');
             setFileData([]); // Limpiar datos si hay error
             return;
         }
          if (fileDate === null) {
              alert('No se encontró la fecha del archivo. Asegúrate de que contiene "Fecha: DD de Mes de YYYY".');
              setFileData([]); // Limpiar datos si hay error
              return;
          }


        // Procesar las filas de datos a partir de la siguiente al encabezado
        // Usaremos los valores de la fila de encabezado para mapear los datos correctamente
        const headerRow = rawData[headerRowIndex];
        const nombreColIndex = headerRow.indexOf('Nombre');
        const ciColIndex = headerRow.indexOf('C.I.');
        const hIngresoColIndex = headerRow.indexOf('H. Ingreso');
        const hSalidaColIndex = headerRow.indexOf('H. Salida');

        // Validar que se encontraron las columnas necesarias
         if (nombreColIndex === -1 || ciColIndex === -1 || hIngresoColIndex === -1 || hSalidaColIndex === -1) {
             alert('No se encontraron todas las columnas necesarias (Nombre, C.I., H. Ingreso, H. Salida).');
             setFileData([]);
             return;
         }


        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];

            // Asegurarnos de que la fila tiene suficientes columnas antes de intentar acceder
            if (row.length <= Math.max(nombreColIndex, ciColIndex, hIngresoColIndex, hSalidaColIndex)) {
                continue; // Saltar filas que no tienen todas las columnas esperadas
            }

            // Extraer los datos usando los índices de las columnas
            const nombreTrabajador = row[nombreColIndex];
            const cedula = row[ciColIndex];
            const horaIngreso = row[hIngresoColIndex];
            const horaSalida = row[hSalidaColIndex];


            // Ignorar filas que no parecen ser datos de trabajadores (ej: filas vacías)
            // Podemos ajustar esta condición si hay otros patrones a ignorar
            if (!nombreTrabajador || !cedula) {
                continue; // Saltar filas sin Nombre o C.I.
            }

            processedData.push({
                fecha: fileDate, // Usar la fecha encontrada
                nombreTrabajador: nombreTrabajador,
                cedula: cedula,
                horaIngreso: horaIngreso,
                horaSalida: horaSalida,
                // TODO: Añadir proyectoId aquí cuando estemos listos para subir a Firebase
            });
        }

        console.log('Datos del archivo Excel procesados:', processedData); // Log para ver los datos procesados
        setFileData(processedData); // Almacenar los datos procesados en el estado `fileData`

        // Update the state with the name of the successfully loaded file
        setLastLoadedFileName(file.name);

      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      alert('Error al leer el archivo.');
      setFileData([]); // Limpiar datos en caso de error de lectura
    };

    reader.readAsArrayBuffer(file);
  } else {
      setFileData([]); // Limpiar fileData si no se selecciona archivo o se cancela
  }
};


  // Placeholder for project management
  const handleCreateProject = () => {
    console.log('Create project clicked');
    // TODO: Implement create project functionality (este botón es el verde, puedes decidir si lo mantienes o lo eliminas)
  };

  const handleEditProject = (projectName: string) => {
    console.log('Edit project clicked:', projectName);
    // TODO: Implement edit project functionality
  };

  const handleDeleteProject = (projectName: string) => {
    console.log('Delete project clicked:', projectName);
    // TODO: Implement delete project functionality
  };

  return (
    console.log('Valor de authLoading justo antes del return:', authLoading), // **Añade este nuevo log aquí**
    // Muestra un indicador de carga mientras se verifica la autenticación
    authLoading ? (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">Cargando...</div>
    ) : (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard Horas Extras</h1>

      {/* Project Selection Section */}
 <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Seleccionar Proyecto</h2>
        {loadingProjects ? (
          <p>Cargando proyectos...</p>
        ) : errorLoadingProjects ? (
          <p className="text-red-500">{errorLoadingProjects}</p>
        ) : projectList.length === 0 ? (
          <p>No hay proyectos disponibles. Crea uno nuevo.</p>
        ) : (
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="border rounded p-2 w-full md:w-1/2"
          >
            <option value="">-- Selecciona un Proyecto --</option>
            {projectList.map((project, index) => (
              <option key={index} value={project}>
                {project}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* File Upload Section */}
 <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Cargar Datos de Horas Extras (Excel)</h2>
        <input
          id="file-upload" // Añadir un ID para asociarlo con el label
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="hidden" // Ocultar el input original
        />
        {/* Label que actuará como botón */}
 <label
          htmlFor="file-upload"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded
                     focus:outline-none focus:shadow-outline cursor-pointer inline-block mb-2"
 >
 Seleccionar archivo
 </label>
        {/* Mostrar el nombre del archivo seleccionado si existe */}
        {fileData.length > 0 && event.target.files && event.target.files[0] && (
          <span className="ml-2 text-gray-700">{event.target.files[0].name}</span>
        )}
        {fileData.length > 0 && (
          <> {/* Usar fragmento en lugar de div si no es necesario */}
            <h3 className="text-lg font-semibold mb-2">Datos Procesados del Archivo:</h3>
            <p className="mb-2">{fileData.length} registros encontrados.</p>
            <button
              onClick={handleUploadHoursData}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Subir Datos a Firebase
            </button>
            {/* Opcional: Mostrar una previsualización de los datos */}
            {/*
            <div className="mt-4 max-h-60 overflow-y-auto border rounded p-2">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">C.I.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">H. Ingreso</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">H. Salida</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {fileData.map((record, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap">{record.fecha}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{record.nombreTrabajador}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{record.cedula}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{record.horaIngreso}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{record.horaSalida}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             */}
          </>
        )}
      </div>

      {/* Display Hours Data Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Datos de Horas Extras del Proyecto Seleccionado</h2>
        {selectedProject ? (
          hoursData.length === 0 ? (
            <p>No hay datos de horas extras subidos para este proyecto.</p>
          ) : (
            <div className="mt-4 max-h-96 overflow-y-auto border rounded p-2"> {/* Added max height and scroll */}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre Trabajador</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Ingreso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Salida</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    {/* Add more headers if you have more fields */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {hoursData.map((record, index) => (
                    <tr key={index}> {/* Using index as key is acceptable for simple lists, consider a unique ID if available */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.fecha}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.nombreTrabajador}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.cedula}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.horaIngreso}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.horaSalida}</td>
 <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteRecord(record.id)} // Call handleDeleteRecord on click
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
                        >
                          Eliminar
                        </button>
                      </td>
                      {/* Add more cells for other fields */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p>Selecciona un proyecto para ver los datos de horas extras.</p>
        )}
      </div>

      {/* Project Management Section */}
 <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Gestión de Proyectos/Fincas</h2>

        {/* Formulario para crear nuevo proyecto */}
        <div className="mb-4">
          <label htmlFor="new-project-name" className="block text-gray-700 font-bold mb-2">
            Nombre del Nuevo Proyecto:
          </label>
          <input
            type="text"
            id="new-project-name"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={newProjectName} // Vinculado al estado newProjectName
            onChange={(e) => setNewProjectName(e.target.value)} // Actualiza el estado al escribir
            disabled={isCreatingProject} // Deshabilita mientras se crea
          />
        </div>

        <button
          onClick={handleCreateProjectFirebase} // Llama a la función para guardar en Firebase
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2 ${isCreatingProject ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isCreatingProject} // Deshabilita mientras se crea
        >
          {isCreatingProject ? 'Guardando...' : 'Guardar Nuevo Proyecto'}
        </button>


        {/* Botón original "Crear Nuevo Proyecto" (puedes decidir si lo mantienes o lo eliminas) */}
        <button
          onClick={handleCreateProject} // Esto actualmente solo hace un console.log
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
        >
          Crear Nuevo Proyecto
        </button>
        {loadingProjects && <p>Cargando proyectos para gestionar...</p>} {/* Este indicador se mantiene */}
        {errorLoadingProjects && <p className="text-red-500">{errorLoadingProjects}</p>}
        {!loadingProjects && !errorLoadingProjects && (
           <ul>
            {projectList.length === 0 ? (
              <li>No hay proyectos creados.</li>
            ) : (
              projectList.map((project, index) => (
                <li key={index} className="flex justify-between items-center border-b py-2">
                  <span>{project}</span>
                  <div>
                    <button
                      onClick={() => handleEditProject(project)}
                      className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded mr-2 focus:outline-none focus:shadow-outline text-sm"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project)}
                      className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* TODO: Add other dashboard sections here (Reports, Data Comparison, Data Generation) */}
    </div>
    ) // Cierre del ternario de authLoading
  );
}

