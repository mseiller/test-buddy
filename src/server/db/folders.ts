import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc, collection, query, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { Folder } from '@/types';

export async function createFolder(uid: string, name: string, color?: string): Promise<Folder> {
  const folderRef = doc(collection(db, 'users', uid, 'folders'));
  const now = Date.now();
  const folder: Folder = { 
    id: folderRef.id, 
    name, 
    color: color ?? undefined, 
    createdAt: now, 
    updatedAt: now, 
    testCount: 0 
  };
  await setDoc(folderRef, folder);
  return folder;
}

export async function renameFolder(uid: string, folderId: string, name: string): Promise<void> {
  const folderRef = doc(db, 'users', uid, 'folders', folderId);
  await updateDoc(folderRef, { 
    name, 
    updatedAt: Date.now() 
  });
}

export async function deleteFolder(uid: string, folderId: string): Promise<void> {
  const folderRef = doc(db, 'users', uid, 'folders', folderId);
  const testsRef = collection(db, 'users', uid, 'folders', folderId, 'tests');
  
  // Check if folder has tests
  const testsSnapshot = await getDocs(testsRef);
  if (!testsSnapshot.empty) {
    throw new Error('Cannot delete folder that contains tests. Move or delete tests first.');
  }
  
  await deleteDoc(folderRef);
}

export async function listFolders(uid: string): Promise<Folder[]> {
  const foldersRef = collection(db, 'users', uid, 'folders');
  const q = query(foldersRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Folder);
}

export async function getFolder(uid: string, folderId: string): Promise<Folder | null> {
  const folderRef = doc(db, 'users', uid, 'folders', folderId);
  const folderDoc = await getDoc(folderRef);
  return folderDoc.exists() ? ({ id: folderDoc.id, ...folderDoc.data() }) as Folder : null;
}

export async function updateFolderColor(uid: string, folderId: string, color: string): Promise<void> {
  const folderRef = doc(db, 'users', uid, 'folders', folderId);
  await updateDoc(folderRef, { 
    color, 
    updatedAt: Date.now() 
  });
}
