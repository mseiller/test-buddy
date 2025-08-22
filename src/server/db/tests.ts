import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, deleteDoc, collection, query, orderBy, getDocs, getDoc, runTransaction } from 'firebase/firestore';
import { TestDoc } from '@/types';

export async function createTest(uid: string, folderId: string, payload: Partial<TestDoc>): Promise<TestDoc> {
  const testRef = doc(collection(db, 'users', uid, 'folders', folderId, 'tests'));
  const folderRef = doc(db, 'users', uid, 'folders', folderId);
  
  const now = Date.now();
  const test: TestDoc = {
    id: testRef.id,
    folderId,
    name: payload.name || 'Untitled Test',
    sourceFile: payload.sourceFile,
    meta: payload.meta,
    tags: payload.tags || [],
    questionsIndexReady: payload.questionsIndexReady || false,
    createdAt: now,
    updatedAt: now,
  };
  
  // Use transaction to ensure atomicity
  await runTransaction(db, async (tx) => {
    // Create the test
    tx.set(testRef, test);
    
    // Increment folder test count
    const folderDoc = await tx.get(folderRef);
    const currentCount = folderDoc.exists() ? (folderDoc.data()?.testCount || 0) : 0;
    tx.set(folderRef, { 
      testCount: currentCount + 1, 
      updatedAt: now 
    }, { merge: true });
  });
  
  return test;
}

export async function moveTest(
  uid: string, 
  testId: string, 
  fromFolderId: string, 
  toFolderId: string
): Promise<void> {
  const fromRef = doc(db, 'users', uid, 'folders', fromFolderId);
  const toRef = doc(db, 'users', uid, 'folders', toFolderId);
  const oldTestRef = doc(db, 'users', uid, 'folders', fromFolderId, 'tests', testId);
  const newTestRef = doc(db, 'users', uid, 'folders', toFolderId, 'tests', testId);

  await runTransaction(db, async (tx) => {
    // Get the test data
    const testSnap = await tx.get(oldTestRef);
    if (!testSnap.exists()) {
      throw new Error('Test not found');
    }
    
    const testData = testSnap.data() as TestDoc;
    
    // Create test in new folder
    tx.set(newTestRef, { 
      ...testData, 
      folderId: toFolderId, 
      updatedAt: Date.now() 
    });
    
    // Delete from old folder
    tx.delete(oldTestRef);

    // Update folder test counts
    const fromFolder = await tx.get(fromRef);
    const toFolder = await tx.get(toRef);
    
    const fromCount = Math.max(0, (fromFolder.data()?.testCount || 0) - 1);
    const toCount = (toFolder.data()?.testCount || 0) + 1;
    
    tx.set(fromRef, { 
      testCount: fromCount, 
      updatedAt: Date.now() 
    }, { merge: true });
    
    tx.set(toRef, { 
      testCount: toCount, 
      updatedAt: Date.now() 
    }, { merge: true });
  });
}

export async function getTest(uid: string, folderId: string, testId: string): Promise<TestDoc | null> {
  const testRef = doc(db, 'users', uid, 'folders', folderId, 'tests', testId);
  const testDoc = await getDoc(testRef);
  return testDoc.exists() ? ({ id: testDoc.id, ...testDoc.data() }) as TestDoc : null;
}

export async function listTests(uid: string, folderId: string): Promise<TestDoc[]> {
  const testsRef = collection(db, 'users', uid, 'folders', folderId, 'tests');
  const q = query(testsRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as TestDoc);
}

export async function updateTest(
  uid: string, 
  folderId: string, 
  testId: string, 
  updates: Partial<TestDoc>
): Promise<void> {
  const testRef = doc(db, 'users', uid, 'folders', folderId, 'tests', testId);
  await updateDoc(testRef, { 
    ...updates, 
    updatedAt: Date.now() 
  });
}

export async function deleteTest(uid: string, folderId: string, testId: string): Promise<void> {
  const testRef = doc(db, 'users', uid, 'folders', folderId, 'tests', testId);
  const folderRef = doc(db, 'users', uid, 'folders', folderId);
  
  await runTransaction(db, async (tx) => {
    // Delete the test
    tx.delete(testRef);
    
    // Decrement folder test count
    const folderDoc = await tx.get(folderRef);
    const currentCount = folderDoc.exists() ? (folderDoc.data()?.testCount || 0) : 0;
    tx.set(folderRef, { 
      testCount: Math.max(0, currentCount - 1), 
      updatedAt: Date.now() 
    }, { merge: true });
  });
}
