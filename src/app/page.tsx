// src/app/page.tsx
'use client';


import { writeBatch } from 'firebase/firestore';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { useState, useEffect, ChangeEvent } from 'react';
import { db } from './lib/firebase'; // Import the initialized Firestore instance
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth } from './lib/firebase'; // Importa la instancia de auth
import { Project, Trabajador, addTrabajador, getTrabajadoresByCompany } from './lib/projectService'; // Import the Project interface and Trabajador related stuff
import * as XLSX from 'xlsx'; // Importa la librería xlsx






const BATCH_SIZE = 500 // Define the batch size for deletions


export default function Dashboard() {
   const [selectedProject, setSelectedProject] = useState('');
   const [projectList, setProjectList] = useState<Project[]>([]);
   const [loadingProjects, setLoadingProjects] = useState(true); // State for loading indicator
   const [errorLoadingProjects, setErrorLoadingProjects] = useState<string | null>(null); // New state for error handling
   const [newProjectName, setNewProjectName] = useState(''); // Estado para el nombre del nuevo proyecto
   const [isCreatingProject, setIsCreatingProject] = useState(false); // Estado para indicar si se está creando un proyecto




 const [startDate, setStartDate] = useState(''); // New state for start date filter
  const [endDate, setEndDate] = useState(''); // New state for end date filter
  const [filterByName, setFilterByName] = useState(''); // New state for name filter
  const [filterByCedula, setFilterByCedula] = useState(''); // New state for cedula filter
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Estado para el estado de autenticación
  const [authLoading, setAuthLoading] = useState(true); // Estado para el estado de carga de autenticación
  const router = useRouter(); // Instancia del router
  const [fileData, setFileData] = useState<any[]>([]); // New state to store processed Excel data
  const [lastLoadedFileName, setLastLoadedFileName] = useState(''); // New state to store the name of the last loaded file
  const [hoursData, setHoursData] = useState<any[]>([]); // New state to store fetched hours data


  // New state variables for Absence Registration
  const [selectedWorkerForAbsence, setSelectedWorkerForAbsence] = useState(''); // To store the selected worker's ID or Cédula
  const [absenceDate, setAbsenceDate] = useState(''); // To store the absence date
  const [absenceType, setAbsenceType] = useState(''); // To store the type of absence
  const [absenceDescription, setAbsenceDescription] = useState(''); // To store the optional description


  // State variables for testing Trabajador functionality
  const [newTrabajadorNombre, setNewTrabajadorNombre] = useState('');
  const [newTrabajadorCedula, setNewTrabajadorCedula] = useState('');
  const [newTrabajadorEstado, setNewTrabajadorEstado] = useState('');


  // Function to format the date to dd/mm/yyyy
  const formatDateToDDMMYYYY = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };




  console.log('Componente Dashboard renderizado'); // Console log de renderización


  // State for the list of workers
  const [trabajadoresList, setTrabajadoresList] = useState<Trabajador[]>([]);


  // Function to fetch workers
  const fetchTrabajadores = async () => {
    try {
      const companyId = 'company1'; // Use the hardcoded company ID for now
      const workers = await getTrabajadoresByCompany(companyId);
      setTrabajadoresList(workers);
    } catch (error) {
      console.error('Error fetching trabajadores:', error);
    }
  };




  // Function to handle adding a worker
  const handleAddTrabajador = async () => {
    try {
      const companyId = 'company1'; // Use the hardcoded company ID for now
      await addTrabajador(companyId, { nombre: newTrabajadorNombre, cedula: newTrabajadorCedula, estado: newTrabajadorEstado });
      setNewTrabajadorNombre('');
      setNewTrabajadorCedula('');
      setNewTrabajadorEstado('');
      fetchTrabajadores(); // Refresh the list after adding
    } catch (error) {
      console.error('Error adding trabajador:', error);
    }
  };




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
    }
 // Call fetchTrabajadores when the component mounts and authentication status changes


  }, [router]);


  const handleLogout = async () => {
    try {
      await auth.signOut();
      console.log('Usuario cerró sesión');
      // Redirigir a la página de inicio de sesión después de cerrar sesión
      router.push('/auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('Error al cerrar sesión. Inténtalo de nuevo.');
    }
  };




  // Function to fetch hours data for the selected project from Firestore
const fetchHoursData = async (projectId: string) => {
  if (!projectId) {
 setHoursData([]); // Clear hours data if no project is selected
 setHoursData([]); // Clear hours data if no project is selected
    return;
  }
  console.log(`Fetching hours data for project ID: ${projectId}`);
  try {
    const companyId = 'company1'; // TODO: Replace with dynamic company ID
    // Use the correct Firestore path based on the user's database structure
    const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');


    // Inicia la consulta con la referencia a la colección
    let q = query(hoursCollectionRef);


    // Aplica filtro por fecha de inicio si startDate tiene valor
    // Parse the startDate string to a Date object
    // The input type="date" gives YYYY-MM-DD format
    if (startDate) {
      const [year, month, day] = startDate.split('-').map(Number);
      // Month is 0-indexed in the Date constructor
      const startDateTime = new Date(year, month - 1, day);
      // Ensure it's the beginning of the day in local time
      startDateTime.setHours(0, 0, 0, 0);
      q = query(q, where('fecha', '>=', startDateTime));
    }


    // Aplica filtro por fecha de fin si endDate tiene valor
    // Parse the endDate string to a Date object
    if (endDate) {
      // The input type="date" gives YYYY-MM-DD format
      const [year, month, day] = endDate.split('-').map(Number);
      // Month is 0-indexed in the Date constructor
      const endDateTime = new Date(year, month - 1, day);
      // Ensure it's the end of the day in local time
      endDateTime.setHours(23, 59, 59, 999);
      q = query(q, where('fecha', '<=', endDateTime));
    }


    // Aplica filtro por nombre si filterByName tiene valor (ignorando espacios)
    if (filterByName.trim()) {
      // Nota: Firestore where('fieldName', '==', value) requiere un match exacto.
      // Para partial matches o "starts with", la lógica es más compleja
      // y podría requerir una estrategia diferente (como obtener más datos y filtrar en frontend
      // o usar soluciones como Algolia/Elasticsearch).
      q = query(q, where('nombreTrabajador', '==', filterByName.trim()));
    }


    // Aplica filtro por cédula si filterByCedula tiene valor (ignorando espacios)
    if (filterByCedula.trim()) {
        // Para búsquedas exactas:
        q = query(q, where('cedula', '==', filterByCedula.trim()));
        // Similar al nombre, búsquedas parciales o "startsWith" son más complejas.
      }


    const querySnapshot = await getDocs(q);


    const data = querySnapshot.docs.map(doc => {
      const docData = doc.data();
      let recordDate: string | Date | null = null; // Allow Date object, string, or null


      // Check if fecha is a valid Firestore Timestamp object before converting
      if (docData.fecha && typeof docData.fecha === 'object' && docData.fecha.seconds !== undefined && docData.fecha.nanoseconds !== undefined) {
        try {
 recordDate = new Date(docData.fecha.seconds * 1000); // Convert Timestamp to Date object
        } catch (error) {
          console.error("Error formatting date from Firestore Timestamp:", docData.fecha, error);
 recordDate = 'Invalid Date'; // Handle formatting errors
        }
      } else {
          console.warn("Fecha field is missing or not a valid Firestore Timestamp:", docData.fecha);
      }
 return {
        id: doc.id,
 fecha: recordDate, // Store the Date object or error string
        ...docData as { nombreTrabajador: string; cedula: string;
          horaIngreso: string; horaSalida: string; projectId: string; }
      } // Explicitly type the data
    });




    setHoursData(data);
    console.log(`Fetched ${data.length} hours records.`);




  } catch (error) {
    console.error('Error fetching hours data:', error);
  }
};




  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      setErrorLoadingProjects(null);
      const companyId = 'company1'; // TODO: Replace with dynamic company ID after authentication implementation
      const projectsCollection = collection(db, 'companies', companyId, 'projects');




      console.log('Intentando leer de Firestore:', `companies/${companyId}/projects`); // Console log antes de leer




      const projectSnapshot = await getDocs(projectsCollection);




      console.log('Snapshot recibido:', projectSnapshot); // **Nuevo log**




      console.log('Datos recibidos de Firestore (antes de mapear):', projectSnapshot.docs.map(doc => doc.data())); // Nuevo log




      const projects: Project[] = projectSnapshot.docs
        .map(doc => ({
            id: doc.id, // Include the document ID
            name: doc.data().name || 'Unnamed Project', // Ensure name exists
            createdAt: doc.data().createdAt ? doc.data().createdAt.toDate() : new Date(), // Convert timestamp to Date, provide default
            restDays: doc.data().restDays || [], // Provide default
            weeklyOvertimeLimit: 8, // Example: 8 hours
            dailyOvertimeLimit: 2, // Example: 2 hours
            hourlyRate: 5, // Example: 5 per hour
        })); // Map to Project objects




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


  // Function to fetch project ID and then hours data
  const fetchProjectAndHours = async () => {
    console.log("Iniciando fetchProjectAndHours para el proyecto:", selectedProject);
    if (!selectedProject) {
      console.log("No hay proyecto seleccionado en fetchProjectAndHours.");
 setHoursData([]); // Clear hours data if no project is selected
 return;
    }


    try {
      const companyId = 'company1'; // TODO: Replace with dynamic company ID
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
const projectDocRef = doc(projectsCollectionRef, selectedProject); // Get document reference by ID
const projectDocSnap = await getDoc(projectDocRef); // Get the document snapshot


if (projectDocSnap.exists()) {
        const projectId = projectDocSnap.id;
        console.log(`Found project ID ${projectId} for selected project ID ${selectedProject}`);
        fetchHoursData(projectId); // Call fetchHoursData with the project ID
} else {
        console.error(`Project with ID ${selectedProject} not found.`);
        setHoursData([]); // Clear hours data if project is not found
}


    } catch (error) {
      console.error('Error fetching project ID:', error);
      setHoursData([]); // Clear hours data in case of error
    }
  };


  // Function to handle applying filters
  const handleApplyFilters = () => {
    console.log('Aplicando filtros...');
    fetchProjectAndHours(); // Call the function that fetches project ID and then hours data
  };


 // New function to handle deleting records by date range
 const handleDeleteRecordsByDateRange = async () => {
  console.log('Iniciando eliminación de registros por rango de fechas.');


  if (!selectedProject) {
    alert('Por favor, selecciona un proyecto antes de eliminar datos.');
    return;
  }


  if (!startDate || !endDate) {
    alert('Por favor, selecciona una fecha de inicio y una fecha de fin para eliminar registros.');
    return;
  }


  // Confirm with the user before deleting
  const confirmDelete = confirm(`¿Estás seguro de que quieres eliminar todos los registros para el proyecto "${selectedProject}" entre las fechas ${startDate} y ${endDate}?`);
  if (!confirmDelete) {
    console.log('Eliminación cancelada por el usuario.');
    return;
  }


  let projectId: string | null = null; // Declare projectId outside the if block


  try {
    const companyId = 'company1'; // TODO: Replace with dynamic company ID
    // Find the project ID for the selected project
 const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
 const projectDocRef = doc(projectsCollectionRef, selectedProject); // Usar el ID directamente
 const projectDocSnap = await getDoc(projectDocRef);


    if (!projectDocSnap.exists()) {
 alert(`Error: No se encontró el proyecto con ID "${selectedProject}" en la base de datos.`);
      return;
    }


    projectId = projectDocSnap.id; // Assign value inside the if block
    const hoursCollectionRef = collection(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras');


    // --- MODIFICACIÓN: Usar objetos Date/Timestamps para la consulta ---
    // Parse the startDate string to a Date object
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const startDateTime = new Date(startYear, startMonth - 1, startDay);
    startDateTime.setHours(0, 0, 0, 0); // Beginning of the day


    // Parse the endDate string to a Date object
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const endDateTime = new Date(endYear, endMonth - 1, endDay);
    endDateTime.setHours(23, 59, 59, 999); // End of the day
    // --- FIN MODIFICACIÓN ---




    // Use the Date objects for the query
    const qDelete = query(hoursCollectionRef,
        where('fecha', '>=', startDateTime),
        where('fecha', '<=', endDateTime)
    );
    const querySnapshotDelete = await getDocs(qDelete);


    if (querySnapshotDelete.empty) {
      alert(`No se encontraron registros para eliminar en el rango de fechas especificado (${startDate} a ${endDate}).`);
      return;
    }


    // Delete documents in batches
    const batch = writeBatch(db);
    querySnapshotDelete.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });


    await batch.commit();
    console.log(`Eliminados ${querySnapshotDelete.docs.length} registros.`);
    alert(`Se eliminaron ${querySnapshotDelete.docs.length} registros para el proyecto "${selectedProject}" entre las fechas ${startDate} y ${endDate}.`);
    
    // Clear the date inputs after successful deletion
    setStartDate('');
    setEndDate('');
    if (projectId) { // Ensure projectId is not null before calling fetchHoursData
 fetchHoursData(projectId); // Refresh the hours data after deletion
    }
  } catch (error) {
    console.error('Error al eliminar registros por rango de fechas:', error);
    alert('Error al eliminar registros por rango de fechas. Inténtalo de nuevo.');
  }
};




  useEffect(() => {
    // Verifica que isAuthenticated sea verdadero antes de llamar a fetchProjects
    if (isAuthenticated) {
      console.log('Usuario autenticado, llamando a fetchProjects');
      fetchProjects();
    } else {
      console.log('Usuario no autenticado, no se llama a fetchProjects');
    }
    // Fetch hours data when the selected project changes
    // This will load initial data when a project is selected.
    if (isAuthenticated && selectedProject) {
      console.log("Usuario autenticado y proyecto seleccionado. Intentando obtener ID del proyecto.");
      // Llamar a fetchProjectAndHours para obtener el ID y luego fetchHoursData
      fetchProjectAndHours();
    } else {
      setHoursData([]); // Clear hours data if no project is selected
    }


    // Fetch workers when the component mounts and authentication status changes
    if (isAuthenticated) {
      fetchTrabajadores();
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
        createdAt: new Date(), // Opcional: añadir una marca de tiempo
        // Initial project configuration (should be configurable in the UI)
        restDays: [0, 6], // Example: Sunday (0) and Saturday (6)
        weeklyOvertimeLimit: 8, // Example: 8 hours
        dailyOvertimeLimit: 2, // Example: 2 hours
        hourlyRate: 5, // Example: 5 per hour
      });




      console.log('Proyecto creado con ID:', docRef.id);
      alert('Proyecto creado con éxito!');




      setNewProjectName(''); // Limpiar el input después de crear
      // En lugar de fetchProjects(), actualiza el estado local para ver el cambio inmediatamente:
      // fetchProjects(); // Comenta o elimina esta línea si quieres actualización inmediata
      // Para actualización inmediata (opción 1 mencionada antes):
      setProjectList(prevList => [...prevList, {
        id: docRef.id,
        name: newProjectName.trim(),
        createdAt: new Date(),
        restDays: [0, 6], // Default values
        weeklyOvertimeLimit: 8,
        dailyOvertimeLimit: 2,
        hourlyRate: 5,
    }]);










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
const projectDocRef = doc(projectsCollectionRef, selectedProject); // Get document reference by ID
const projectDocSnap = await getDoc(projectDocRef); // Get the document snapshot


if (!projectDocSnap.exists()) {
    alert(`Error: No se encontró el proyecto con ID "${selectedProject}" en la base de datos.`);
    // TODO: Resetear estado de carga
    // setIsUploading(false);
    return;
}


const projectId = projectDocSnap.id;
console.log(`Subiendo datos al proyecto con ID: ${projectId}`);






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
    setLastLoadedFileName(''); // Clear the file name display


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




const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => { // Function to handle file upload
  console.log('Función handleFileUpload llamada.'); // Log al inicio




  // Add checks for event.target and files
  if (!event.target || !event.target.files) { // Check if a file was selected
    console.error('No file target found or no files selected.');
    setFileData([]); // Clear fileData if no file is selected or target is null
    return;
  }




  const files = event.target.files; // Get the selected files
  if (files.length > 0 && files[0]) { // Check if files array is not empty and has a first element
    const file = files[0];
    const reader = new FileReader();




    // Check if the file name is the same as the last loaded file
    if (file.name === lastLoadedFileName) { // Prevent processing the same file multiple times
      alert(`El archivo "${file.name}" ya ha sido cargado.`);
      return; // Stop processing if it's a duplicate
    }




    reader.onload = (e) => {
      if (e.target && e.target.result) { // Check if the file reading was successful
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' }); // Read the Excel file




        // Assume you want to read the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];




        // Convertir la hoja a un array de arrays (cada array es una fila)
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Raw Excel data (array of arrays):', rawData); // Log raw data




        // --- Logic to extract date and project name from file name ---
        const fileName = file.name;
        const fileNameMatch = fileName.match(/^DIARIO_(.+)_(\d{8})\.xlsx$/i); // Regex to match DIARIO_NombreProyecto_YYYYMMDD.xlsx


        let fileDateObject: Date | null = null;
        let projectNameFromFile: string | null = null;


        let headerRowIndex = -1;
        const processedData: any[] = [];


        // Find the header row (assuming 'Nombre' is a header)
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
             if (row.length > 1 && row[1] === 'Nombre') {
                 headerRowIndex = i;
                 console.log(`Encabezado de columnas encontrado en la fila ${i}`); // Log cuando se encuentra
             }
             // Buscar la fila que contiene la fecha (Ej: "Fecha: 02 de Julio de 2025")
            // Buscar en la segunda columna (índice 1) si contiene la cadena "Fecha:"
             if (row.length > 1 && typeof row[1] === 'string' && row[1].includes('Fecha:')) {
                 console.warn(`Fecha encontrada en el contenido del archivo en la fila ${i}. Se ignorará y se usará la fecha del nombre del archivo.`);
             }
        }




        // --- Process extracted date and project name from file name ---
        if (fileNameMatch && fileNameMatch[1] && fileNameMatch[2]) {
            projectNameFromFile = fileNameMatch[1].replace(/_/g, ' '); // Replace underscores with spaces for project name
            const dateStringFromFile = fileNameMatch[2]; // YYYYMMDD


            const year = parseInt(dateStringFromFile.substring(0, 4), 10);
            const month = parseInt(dateStringFromFile.substring(4, 6), 10) - 1; // Months are 0-indexed
            const day = parseInt(dateStringFromFile.substring(6, 8), 10);


            fileDateObject = new Date(year, month, day);


            if (isNaN(fileDateObject.getTime())) {
                fileDateObject = null; // Not a valid date
                console.error("Extracted date from file name is not valid:", dateStringFromFile);
            } else {
                console.log("Date extracted from file name:", fileDateObject);
                console.log("Project Name extracted from file name:", projectNameFromFile);
            }
        }


         if (headerRowIndex === -1) {
             alert('No se encontró la fila de encabezado con "Nombre". Asegúrate de que el formato sea correcto.');
             setFileData([]); // Limpiar datos si hay error
             return;
         }
          if (fileDateObject === null) {
              alert('No se pudo extraer una fecha válida del nombre del archivo. Asegúrate de que el nombre siga el formato DIARIO_NombreProyecto_YYYYMMDD.xlsx');
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


            // Store the date as a Date object
            processedData.push({
                fecha: fileDateObject, // **Ahora almacenamos el objeto Date**
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




  const handleEditProject = (project: Project) => {
    console.log('Edit project clicked:', project);
    // TODO: Implement edit project functionality
  };




  const handleDeleteProject = (project: Project) => {
    console.log('Delete project clicked:', project);
    // TODO: Implement delete project functionality
  };


  const handleDeleteRecord = async (recordId: string) => {
    console.log(`Attempting to delete record with ID: ${recordId}`);
 if (!selectedProject) {
 alert('Por favor, selecciona un proyecto para eliminar registros individuales.');
 return;
    }
    try {
      const companyId = 'company1'; // TODO: Replace with dynamic company ID


      // Find the project ID for the selected project
      const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
      const projectDocRef = doc(projectsCollectionRef, selectedProject); // Get document reference by ID
      const projectDocSnap = await getDoc(projectDocRef); // Get the document snapshot


      if (!projectDocSnap.exists()) {
          alert(`Error: No se encontró el proyecto con ID "${selectedProject}" en la base de datos.`);
          return;
      }


     
const projectId = projectDocSnap.id;
      console.log(`Encontrado ID del proyecto ${projectId} para eliminar registro.`);




      const recordRef = doc(db, 'companies', companyId, 'projects', projectId, 'registrosHorasExtras', recordId);


      await deleteDoc(recordRef);
      console.log(`Record with ID ${recordId} successfully deleted.`);


    } catch (error) {
      console.error(`Error deleting record with ID ${recordId}:`, error);
    }
  };


  if (authLoading) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-24">Cargando...</div>;
  }




  return (
    <div className="container mx-auto p-4"> {/* Este es el div principal */}
      {/* Botón de Cerrar Sesión */}
      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline absolute top-4 right-4" // Clase para posicionar en la esquina superior derecha
      >
        Cerrar Sesión
      </button>


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
            className="border rounded p-2 w-full md:w-1/2 text-gray-700"
          >
            <option value="">-- Selecciona un Proyecto --</option>
            {projectList.map((project) => (
      <option key={project.id} value={project.id}>
        {project.name}
      </option>
    ))}
          </select>
        )}
      </div>




      {/* File Upload Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Cargar Datos de Horas Extras (Excel)</h2>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded
                     focus:outline-none focus:shadow-outline cursor-pointer inline-block mb-2"
        >
          Seleccionar archivo
        </label>
        {lastLoadedFileName && (
          <span className="ml-2 text-gray-700">{lastLoadedFileName}</span>
        )}
        {fileData.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mb-2">Datos Procesados del Archivo:</h3>
            <p className="mb-2">{fileData.length} registros encontrados.</p>
            <button
              onClick={handleUploadHoursData}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Subir Datos a Firebase
            </button>
          </>
        )}
      </div>




 {/* Filters Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Filtrar Datos de Horas Extras</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="startDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha Inicio:</label>
            <input
              type="date"
              id="startDate"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="endDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha Fin:</label>
            <input
              type="date"
              id="endDate"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="filterByName" className="block text-gray-700 text-sm font-bold mb-2">Filtrar por Nombre:</label>
            <input
              type="text"
              id="filterByName"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={filterByName}
              onChange={(e) => setFilterByName(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="filterByCedula" className="block text-gray-700 text-sm font-bold mb-2">Filtrar por C.I.:</label>
            <input
              type="text"
              id="filterByCedula"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={filterByCedula}
              onChange={(e) => setFilterByCedula(e.target.value)}
            />
          </div>
        </div>
        <button
          onClick={handleApplyFilters}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Aplicar Filtros
        </button>
      </div>


 {/* Button to delete records by date range */}


   {/* Absence Registration Section */}
 <div className="mb-6 p-4 border rounded-md bg-gray-100">
 <h2 className="text-xl font-semibold mb-2">Registrar Ausencia</h2>
 <div className="flex flex-wrap gap-4 mb-4">
   {/* Worker Selection */}
   <div className="flex-1 min-w-[200px]">
     <label htmlFor="absenceWorker" className="block text-gray-700 text-sm font-bold mb-2">Trabajador:</label>
     <select
       id="absenceWorker"
       className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
       value={selectedWorkerForAbsence}
       onChange={(e) => setSelectedWorkerForAbsence(e.target.value)}
     >
       <option value="">-- Selecciona un Trabajador --</option>
       {/* Populate with workers from trabajadoresList */}
       {trabajadoresList.map(worker => (
         <option key={worker.id} value={worker.id}>{worker.nombre} ({worker.cedula})</option>
       ))}
     </select>
   </div>
   {/* Date Selection */}
   <div className="flex-1 min-w-[200px]">
     <label htmlFor="absenceDate" className="block text-gray-700 text-sm font-bold mb-2">Fecha:</label>
     <input
       type="date"
       id="absenceDate"
       className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
       value={absenceDate}
       onChange={(e) => setAbsenceDate(e.target.value)}
     />
   </div>
   {/* Absence Type Selection */}
   <div className="flex-1 min-w-[200px]">
     <label htmlFor="absenceType" className="block text-gray-700 text-sm font-bold mb-2">Tipo de Ausencia:</label>
     <select
       id="absenceType"
       className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
       value={absenceType}
       onChange={(e) => setAbsenceType(e.target.value)}
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
   {/* Description (Optional) */}
   {/* You might want to add an input or textarea for the description here */}
   {/* <div className="flex-1 min-w-[200px]">
       <label htmlFor="absenceDescription" className="block text-gray-700 text-sm font-bold mb-2">Descripción (Opcional):</label>
       <textarea
         id="absenceDescription"
         className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
         value={absenceDescription}
         onChange={(e) => setAbsenceDescription(e.target.value)}
       ></textarea>
    </div> */}
  </div> {/* Closing the flex container for Absence Registration inputs */}
  {/* You might want to add a button to submit the absence here */}
  {/* <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4">
     Registrar Ausencia
  </button> */}
</div> {/* Closing the main div for Absence Registration Section */}




{/* Display Hours Data Section */}
<div className="mb-6">
 <h2 className="text-xl font-semibold mb-2">Datos de Horas Extras del Proyecto Seleccionado</h2>
 {selectedProject ? (
   hoursData.length === 0 ? (
     <p>No hay datos de horas extras subidos para este proyecto.</p>
   ) : (
     <div className="mt-4 max-h-96 overflow-y-auto border rounded p-2">
       <table className="min-w-full divide-y divide-gray-200">
         <thead className="bg-gray-50">
           <tr>
             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Trabajador</th>
             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cédula</th>
             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Ingreso</th>
             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora Salida</th>
             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
           </tr>
         </thead>
         <tbody className="bg-white divide-y divide-gray-200">
         {hoursData.map((record, index) => ( // Added 'index' here
             // Ensure record.id exists before using it as a key
             // If record.id might not always be available, consider using a combination
             // of fields or a generated key if the data is guaranteed to be unique.
             // For now, assuming record.id is reliable for fetched data. */}
             <tr key={record.id || `row-${index}`}> {/* Use record.id as key if available, fallback to index */}
               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                 {record.fecha
                   ? record.fecha instanceof Date
                     ? formatDateToDDMMYYYY(record.fecha)
                     : typeof record.fecha === 'object' && record.fecha.seconds !== undefined
                       ? formatDateToDDMMYYYY(new Date(record.fecha.seconds * 1000))
                       : String(record.fecha)
                   : 'N/A' // Handle cases where fecha is null or undefined
                 }
               </td>
               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.nombreTrabajador}</td>
               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.cedula}</td>
               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.horaIngreso}</td>
               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.horaSalida}</td>
               <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                 <button
                   onClick={() => handleDeleteRecord(record.id)}
                   className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm"
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
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            disabled={isCreatingProject}
          />
        </div>




        <button
          onClick={handleCreateProjectFirebase}
          className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mr-2 ${isCreatingProject ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isCreatingProject}
        >
          {isCreatingProject ? 'Guardando...' : 'Guardar Nuevo Proyecto'}
        </button>




        {/* Botón original "Crear Nuevo Proyecto" (puedes decidir si lo mantienes o lo eliminas) */}
        <button
          onClick={handleCreateProject}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
        >
          Crear Nuevo Proyecto
        </button>




        {loadingProjects && <p>Cargando proyectos para gestionar...</p>}
        {errorLoadingProjects && <p className="text-red-500">{errorLoadingProjects}</p>}
        {!loadingProjects && !errorLoadingProjects && (
          <ul>
            {projectList.length === 0 ? (
              <li>No hay proyectos creados.</li>
            ) : (
              projectList.map((project, index) => (
                <li key={project.id} className="flex justify-between items-center border-b py-2">
 <span>{project.name}</span>
                  <div className="flex items-center">
                    <button
 onClick={() => handleEditProject(project)} // Pass the full project object
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


      {/* Temporary Trabajador Testing Section */}
      <div className="mb-6 p-4 border rounded-md bg-gray-100">
        <h2 className="text-xl font-semibold mb-2">Prueba de Gestión de Trabajadores (Temporal)</h2>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorNombre" className="block text-gray-700 text-sm font-bold mb-2">Nombre:</label>
            <input
              type="text"
              id="trabajadorNombre"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newTrabajadorNombre}
              onChange={(e) => setNewTrabajadorNombre(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorCedula" className="block text-gray-700 text-sm font-bold mb-2">Cédula:</label>
            <input
              type="text"
              id="trabajadorCedula"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newTrabajadorCedula}
              onChange={(e) => setNewTrabajadorCedula(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="trabajadorEstado" className="block text-gray-700 text-sm font-bold mb-2">Estado:</label>
            <input
              type="text"
              id="trabajadorEstado"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={newTrabajadorEstado}
              onChange={(e) => setNewTrabajadorEstado(e.target.value)}
            />
          </div>
        </div>
        <button onClick={handleAddTrabajador} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
          Agregar Trabajador
        </button>
        <h3 className="text-lg font-semibold mt-4 mb-2">Lista de Trabajadores:</h3>
        {trabajadoresList.length === 0 ? (
          <p>No hay trabajadores registrados.</p>
        ) : (
          <ul>
            {trabajadoresList.map((trabajador) => (
              <li key={trabajador.id} className="border-b py-1 text-gray-800">
                {trabajador.nombre} ({trabajador.cedula}) - Estado: {trabajador.estado}
              </li>
            ))}
          </ul>
        )}
      </div>


      {/* TODO: Add other dashboard sections here (Reports, Data Comparison, Data Generation) */}
    </div>
  );
}








