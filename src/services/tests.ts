import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc, collection, addDoc, deleteDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export type TestDoc = {
  id?: string;
  userId: string;
  testName: string;
  fileName: string;
  fileType: string;
  extractedText: string;
  quizType: string;
  questions: any[];
  answers: any[];
  score?: number;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
};

// Single source of truth: /users/{uid}/tests
const getTestsCollection = (uid: string) => collection(db, `users/${uid}/tests`);

export async function createTest(uid: string, data: Omit<TestDoc, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<TestDoc> {
  const ref = getTestsCollection(uid);
  const now = new Date();
  const payload: Omit<TestDoc, 'id'> = { 
    ...data, 
    userId: uid, 
    createdAt: now, 
    updatedAt: now 
  };
  
  const newRef = await addDoc(ref, payload);
  return { id: newRef.id, ...payload };
}

export async function updateTest(uid: string, testId: string, patch: Partial<TestDoc>): Promise<void> {
  const ref = doc(db, `users/${uid}/tests/${testId}`);
  await updateDoc(ref, { ...patch, updatedAt: new Date() });
}

export async function moveTest(uid: string, testId: string, toFolderId: string | null): Promise<void> {
  console.log(`Moving test ${testId} to folder ${toFolderId}`);
  const ref = doc(db, `users/${uid}/tests/${testId}`);
  await updateDoc(ref, { folderId: toFolderId, updatedAt: new Date() });
  console.log(`Successfully moved test ${testId} to folder ${toFolderId}`);
}

export async function getTest(uid: string, testId: string): Promise<TestDoc | null> {
  const ref = doc(db, `users/${uid}/tests/${testId}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  
  return { id: snap.id, ...snap.data() } as TestDoc;
}

// Get all tests for a user
export async function getAllTests(uid: string): Promise<TestDoc[]> {
  const ref = getTestsCollection(uid);
  const q = query(ref, orderBy('createdAt', 'desc'), limit(500));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TestDoc[];
}

// Get tests in a specific folder
export async function getTestsInFolder(uid: string, folderId: string): Promise<TestDoc[]> {
  console.log(`Querying tests collection for folderId: ${folderId}`);
  const ref = getTestsCollection(uid);
  
  // Temporarily remove orderBy to avoid index requirement
  // TODO: Add back orderBy('createdAt', 'desc') after index is deployed
  const q = query(
    ref, 
    where('folderId', '==', folderId),
    limit(500)
  );
  const snapshot = await getDocs(q);
  
  console.log(`Found ${snapshot.docs.length} tests with folderId ${folderId}`);
  
  // Sort manually for now
  const tests = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TestDoc[];
  
  // Manual sort by createdAt desc
  tests.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
    return bTime - aTime;
  });
  
  return tests;
}

// Get unorganized tests (no folder)
export async function getUnorganizedTests(uid: string): Promise<TestDoc[]> {
  const ref = getTestsCollection(uid);
  const q = query(
    ref, 
    where('folderId', '==', null), 
    orderBy('createdAt', 'desc'),
    limit(500)
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TestDoc[];
}

// Migration function to move data from testHistory to new structure
export async function migrateFromTestHistory(uid: string): Promise<number> {
  console.log('Starting migration from testHistory to new tests collection');
  
  // Get all tests from testHistory
  const testHistoryRef = collection(db, 'testHistory');
  const historyQuery = query(testHistoryRef, where('userId', '==', uid));
  const historySnapshot = await getDocs(historyQuery);
  
  // Get existing tests to avoid duplicates
  const existingTests = await getAllTests(uid);
  const existingTestNames = new Set(existingTests.map(t => {
    // Handle both Date objects and Firestore Timestamps
    let timestamp: number;
    if (t.createdAt instanceof Date) {
      timestamp = t.createdAt.getTime();
    } else if (t.createdAt && typeof (t.createdAt as any).toDate === 'function') {
      timestamp = (t.createdAt as any).toDate().getTime();
    } else {
      // Fallback to current time if createdAt is invalid
      timestamp = new Date().getTime();
    }
    return `${t.testName  }_${  timestamp}`;
  }));
  
  let migratedCount = 0;
  
  for (const doc of historySnapshot.docs) {
    const data = doc.data();
    
    // Create unique key to avoid duplicates
    const createdAt = data.createdAt?.toDate() || new Date();
    const uniqueKey = `${data.testName  }_${  createdAt.getTime()}`;
    
    if (existingTestNames.has(uniqueKey)) {
      console.log(`Skipping duplicate test: ${data.testName}`);
      continue;
    }
    
    // Convert to new format - include all required fields
    const testDoc: any = {
      userId: uid,
      testName: data.testName,
      fileName: data.fileName,
      fileType: data.fileType || 'txt',
      extractedText: data.extractedText || '',
      quizType: data.quizType,
      questions: data.questions || [],
      answers: data.answers || [],
      folderId: null, // Default to null for unorganized tests
      createdAt,
      updatedAt: createdAt,
    };

    // Only add optional fields if they have values
    if (data.score !== undefined && data.score !== null) {
      testDoc.score = data.score;
    }
    // Override folderId if one is provided
    if (data.folderId) {
      testDoc.folderId = data.folderId;
    }
    // Handle completedAt more carefully - it might be undefined, null, or a Firestore Timestamp
    if (data.completedAt !== undefined && data.completedAt !== null) {
      if (typeof data.completedAt.toDate === 'function') {
        testDoc.completedAt = data.completedAt.toDate();
      } else if (data.completedAt instanceof Date) {
        testDoc.completedAt = data.completedAt;
      }
      // If it's neither a Timestamp nor a Date, we skip adding completedAt
    }
    
    // Add to new collection
    const newRef = getTestsCollection(uid);
    await addDoc(newRef, testDoc);
    
    console.log(`Migrated test: ${data.testName}`);
    migratedCount++;
  }
  
  console.log(`Migration complete: ${migratedCount} tests migrated`);
  return migratedCount;
}

// Fix any tests that have incorrect folderId
export async function fixFolderMismatches(uid: string, targetFolderId: string): Promise<number> {
  console.log('Fixing folder mismatches in new tests collection');
  
  const allTests = await getAllTests(uid);
  let fixedCount = 0;
  
  for (const test of allTests) {
    // If test has no folderId or wrong folderId, fix it
    if (!test.folderId || test.folderId !== targetFolderId) {
      await moveTest(uid, test.id!, targetFolderId);
      console.log(`Fixed test: ${test.testName} -> folder ${targetFolderId}`);
      fixedCount++;
    }
  }
  
  console.log(`Fixed ${fixedCount} folder mismatches`);
  return fixedCount;
}
