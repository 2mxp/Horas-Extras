import { db } from './firebase';
import { collection, addDoc, getDocs, query } from 'firebase/firestore';

interface Project {
  id: string;
  name: string;
  createdAt: Date; // Assuming createdAt is stored as a Timestamp, Firestore automatically converts Date objects
  // Add other project fields as needed
}

/**
 * Creates a new project document in the specified company's projects subcollection.
 * @param companyId The ID of the company.
 * @param projectName The name of the new project.
 * @returns A promise that resolves with the ID of the newly created project document.
 * @throws Error if there's an error adding the document to Firestore.
 */
export const createProject = async (companyId: string, projectName: string): Promise<string> => {
  try {
    const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
    const docRef = await addDoc(projectsCollectionRef, {
      name: projectName,
      createdAt: new Date(), // Firestore will convert this Date object to a Timestamp
      // Add any default project configuration fields here
      restDays: [0, 6], // Example default
      weeklyOvertimeLimit: 8, // Example default
      dailyOvertimeLimit: 2, // Example default
      hourlyRate: 5, // Example default
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project in Firestore.');
  }
};

/**
 * Fetches all projects for a given company from the projects subcollection.
 * @param companyId The ID of the company.
 * @returns A promise that resolves with an array of Project objects.
 * @throws Error if there's an error fetching the documents from Firestore.
 */
export const getProjectsByCompany = async (companyId: string): Promise<Project[]> => {
  try {
    const projectsCollectionRef = collection(db, 'companies', companyId, 'projects');
    const q = query(projectsCollectionRef); // Add orderBy if needed, e.g., orderBy('name')
    const querySnapshot = await getDocs(q);

    const projects: Project[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        name: data.name,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0), // Convert Timestamp to Date, handle potential missing field
        // Map other project fields as needed
      });
    });

    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects from Firestore.');
  }
};