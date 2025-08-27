import { collection, getDocs, query, orderBy, limit, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logResult } from './results';

const now = () => new Date();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

export interface UserMetrics {
  quizzesTaken: number;
  quizzesTakenInPeriod: number;
  avgScore: number;
  avgLast5: number;
  trend: Array<{ t: Date; score: number }>;
  retakeDelta: number;
  retakeCount: number;
  totalRetakes: number;
}

export interface MetricsFilters {
  days?: number; // undefined = all time
  folderId?: string; // undefined = all folders
}

export async function getUserMetrics(uid: string, filters: MetricsFilters = {}): Promise<UserMetrics> {
  try {
    // Get data from all three collections: results, testHistory, and current tests
    const resultsBase = collection(db, `users/${uid}/results`);
    const testHistoryBase = collection(db, 'testHistory');
    const testsBase = collection(db, `users/${uid}/tests`);

    // Get new results data
    const snapResults = await getDocs(query(resultsBase, orderBy('createdAt', 'desc'), limit(500)));
    const resultsData = snapResults.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Get current tests data (includes folder information)
    const snapTests = await getDocs(query(testsBase, orderBy('createdAt', 'desc'), limit(500)));
    const testsData = snapTests.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        testName: data.testName,
        folderId: data.folderId,
        score: data.score,
        timeTaken: 0, // Tests collection doesn't have timeTaken
        quizType: data.quizType || 'mixed',
        questionCount: data.questions?.length || 0,
        createdAt: data.completedAt || data.createdAt,
        topics: []
      };
    }) as any[];

    // Get legacy test history data
    const snapHistory = await getDocs(
      query(testHistoryBase, where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(500))
    );
    const historyData = snapHistory.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        testName: data.testName,
        folderId: data.folderId,
        score: data.score,
        timeTaken: 0, // Legacy data doesn't have timeTaken
        quizType: data.quizType || 'mixed',
        questionCount: data.questions?.length || 0,
        createdAt: data.completedAt || data.createdAt, // Use completedAt if available
        topics: []
      };
    }) as any[];

    // Combine and deduplicate data from all three sources
    const seenTests = new Set<string>();
    let all = [...resultsData, ...testsData, ...historyData]
      .filter(item => {
        // Only include completed tests with scores
        if (item.score == null || isNaN(item.score)) return false;
        
        // Deduplicate by test name + creation time to avoid counting same test multiple times
        const uniqueKey = `${item.testName}_${item.createdAt?.toDate?.()?.getTime() || new Date(item.createdAt).getTime()}`;
        if (seenTests.has(uniqueKey)) return false;
        seenTests.add(uniqueKey);
        return true;
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime.getTime() - aTime.getTime(); // Newest first
      })
      .slice(0, 500); // Limit total results

    // Apply folder filter if specified
    if (filters.folderId !== undefined) {
      if (filters.folderId === '') {
        // Filter for tests with no folder (empty string or null/undefined)
        all = all.filter(item => !item.folderId || item.folderId === '');
      } else {
        // Filter for tests in specific folder
        all = all.filter(item => item.folderId === filters.folderId);
      }
    }

    // Debug logging
    console.log('Metrics Debug:', {
      totalItems: all.length,
      filters,
      sampleFolderIds: all.slice(0, 8).map(item => ({ testName: item.testName, folderId: item.folderId })),
      allFolderIds: [...new Set(all.map(item => item.folderId))], // Unique folder IDs
      filteringFor: filters.folderId,
      matchingItems: filters.folderId !== undefined ? all.filter(item => {
        if (filters.folderId === '') {
          return !item.folderId || item.folderId === '';
        } else {
          return item.folderId === filters.folderId;
        }
      }).length : 'not filtering',
      // Enhanced debugging for folder ID mismatch
      folderIdComparison: {
        expectedFolderId: filters.folderId,
        actualFolderIds: all.map(item => item.folderId),
        exactMatches: all.filter(item => item.folderId === filters.folderId).length,
        stringComparison: all.map(item => ({
          testName: item.testName,
          actualId: item.folderId,
          expectedId: filters.folderId,
          exactMatch: item.folderId === filters.folderId,
          stringMatch: String(item.folderId) === String(filters.folderId),
          bothTruthy: !!item.folderId && !!filters.folderId
        }))
      }
    });

    // Apply time filter if specified
    let filteredByTime = all;
    if (filters.days) {
      const cutoffDate = daysAgo(filters.days);
      filteredByTime = all.filter(item => {
        const itemDate = item.createdAt?.toDate?.() || new Date(item.createdAt);
        return itemDate >= cutoffDate;
      });
    }

    // Derive metrics from filtered data
    const quizzesTaken = all.length; // Total (unfiltered)
    const quizzesTakenInPeriod = filteredByTime.length; // Filtered by time/folder

    const scores = filteredByTime.map(r => Number(r.score)).filter(x => !isNaN(x));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const last5 = scores.slice(0, 5);
    const avgLast5 = last5.length ? Math.round(last5.reduce((a, b) => a + b, 0) / last5.length) : 0;

    const trend = filteredByTime.slice(0, 10).map(r => ({
      t: r.createdAt?.toDate?.() ?? now(),
      score: r.score
    })).reverse(); // oldest → newest for charts

    // Retake analysis: for results with retakeOf, compare to their originals
    const originals = new Map(all.map(r => [r.id, r]));
    const deltas: number[] = [];
    let retakeCount = 0;
    let totalRetakes = 0;

    for (const r of filteredByTime) {
      if (r.retakeOf) {
        totalRetakes++;
        if (originals.has(r.retakeOf)) {
          const orig = originals.get(r.retakeOf);
          if (orig?.score != null && r.score != null) {
            deltas.push(r.score - orig.score);
            retakeCount++;
          }
        }
      }
    }
    const retakeDelta = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;

    return {
      quizzesTaken,
      quizzesTakenInPeriod,
      avgScore: avg,
      avgLast5,
      trend,
      retakeDelta,
      retakeCount,
      totalRetakes,
    };
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    throw error;
  }
}

// Optional: Migrate existing test history to results collection
export async function migrateTestHistoryToResults(uid: string): Promise<number> {
  try {
    const testHistoryBase = collection(db, 'testHistory');
    const resultsBase = collection(db, `users/${uid}/results`);
    
    // Get all test history for this user
    const snapHistory = await getDocs(
      query(testHistoryBase, where('userId', '==', uid))
    );
    
    // Get existing results to avoid duplicates
    const snapResults = await getDocs(resultsBase);
    const existingResults = new Set(snapResults.docs.map(d => `${d.data().testName  }_${  d.data().createdAt?.seconds}`));
    
    let migratedCount = 0;
    
    for (const doc of snapHistory.docs) {
      const data = doc.data();
      
      // Skip if no score (incomplete test) or already migrated
      if (data.score == null || isNaN(data.score)) continue;
      
      const uniqueKey = `${data.testName  }_${  data.completedAt?.seconds || data.createdAt?.seconds}`;
      if (existingResults.has(uniqueKey)) continue;
      
      // Convert to results format
      const resultData = {
        testName: data.testName,
        folderId: data.folderId,
        score: data.score,
        timeTaken: 0, // Legacy data doesn't have this
        quizType: inferQuizType(data.quizType),
        questionCount: data.questions?.length || 0,
        retakeOf: undefined, // Legacy data doesn't track retakes
        topics: [], // Can be populated later from AI feedback
        createdAt: data.completedAt || data.createdAt
      };
      
      await logResult(uid, resultData);
      migratedCount++;
    }
    
    console.log(`Migrated ${migratedCount} test history records to results collection`);
    return migratedCount;
  } catch (error) {
    console.error('Error migrating test history:', error);
    throw error;
  }
}

function inferQuizType(legacyType: string): string {
  if (!legacyType) return 'mixed';
  
  const type = legacyType.toLowerCase();
  if (type.includes('mcq') || type.includes('multiple')) return 'multiple_choice';
  if (type.includes('fill') || type.includes('blank')) return 'fill_blank';
  if (type.includes('true') || type.includes('false')) return 'true_false';
  if (type.includes('essay')) return 'essay';
  if (type.includes('mixed')) return 'mixed';
  
  return 'mixed';
}

// Get available folders for filter dropdown
export async function getUserFolders(uid: string): Promise<Array<{id: string, name: string, color?: string}>> {
  try {
    const foldersQuery = query(
      collection(db, 'folders'),
      where('userId', '==', uid)
    );
    const snapshot = await getDocs(foldersQuery);
    
    // Sort in JavaScript to avoid composite index requirement
    const folders = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      color: doc.data().color
    }));
    
    return folders.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching user folders:', error);
    return [];
  }
}

// Function to fix tests that should be in folders but show as unorganized
export async function fixUnorganizedTests(uid: string, targetFolderId: string): Promise<number> {
  try {
    console.log('Starting fix for unorganized tests, target folder:', targetFolderId);
    
    // Get all test history
    const testHistoryBase = collection(db, 'testHistory');
    const snapHistory = await getDocs(
      query(testHistoryBase, where('userId', '==', uid))
    );
    
    const allTests = snapHistory.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as any[];
    
    // Find tests that should be in the target folder but aren't
    const unorganizedTests = allTests.filter(test => 
      !test.folderId || test.folderId === '' || test.folderId === null || test.folderId === undefined
    );
    
    console.log(`Found ${unorganizedTests.length} unorganized tests:`, unorganizedTests.map(t => t.testName));
    
    // Update all unorganized tests to be in the target folder
    let fixedCount = 0;
    for (const test of unorganizedTests) {
      try {
        const testRef = doc(db, 'testHistory', test.id);
        await updateDoc(testRef, { folderId: targetFolderId });
        console.log(`Fixed test: ${test.testName} -> folder ${targetFolderId}`);
        fixedCount++;
      } catch (error) {
        console.error(`Failed to fix test ${test.testName}:`, error);
      }
    }
    
    console.log(`Successfully fixed ${fixedCount} tests`);
    return fixedCount;
  } catch (error) {
    console.error('Error fixing unorganized tests:', error);
    throw error;
  }
}

// Function to fix folder ID mismatches - update all tests to use current folder ID
export async function fixFolderIdMismatch(uid: string, targetFolderId: string): Promise<number> {
  try {
    console.log('Starting fix for folder ID mismatch, target folder:', targetFolderId);
    
    // Get all test history
    const testHistoryBase = collection(db, 'testHistory');
    const snapHistory = await getDocs(
      query(testHistoryBase, where('userId', '==', uid))
    );
    
    const allTests = snapHistory.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as any[];
    
    // Find tests that have folder IDs but don't match the target folder
    const mismatchedTests = allTests.filter(test => 
      test.folderId && test.folderId !== '' && test.folderId !== targetFolderId
    );
    
    console.log(`Found ${mismatchedTests.length} tests with mismatched folder IDs:`);
    mismatchedTests.forEach(test => {
      console.log(`- ${test.testName}: current=${test.folderId}, target=${targetFolderId}`);
    });
    
    // Update all mismatched tests to use the target folder ID
    let fixedCount = 0;
    for (const test of mismatchedTests) {
      try {
        const testRef = doc(db, 'testHistory', test.id);
        await updateDoc(testRef, { folderId: targetFolderId });
        console.log(`Fixed test: ${test.testName} -> folder ${targetFolderId}`);
        fixedCount++;
      } catch (error) {
        console.error(`Failed to fix test ${test.testName}:`, error);
      }
    }
    
    console.log(`Successfully fixed ${fixedCount} folder ID mismatches`);
    
    // Trigger a page refresh to update the folder manager UI
    if (fixedCount > 0) {
      console.log('Folder ID fix complete. The folder manager UI will need to refresh to show the updated organization.');
    }
    
    return fixedCount;
  } catch (error) {
    console.error('Error fixing folder ID mismatches:', error);
    throw error;
  }
}

// Migrate to single source of truth: /users/{uid}/tests
export async function migrateToSingleSourceOfTruth(uid: string): Promise<number> {
  try {
    console.log('Starting migration to single source of truth');
    
    // Get all tests from testHistory
    const testHistoryBase = collection(db, 'testHistory');
    const historyQuery = query(testHistoryBase, where('userId', '==', uid));
    const historySnapshot = await getDocs(historyQuery);
    
    // Get existing tests in new collection to avoid duplicates
    const newTestsBase = collection(db, `users/${uid}/tests`);
    const existingSnapshot = await getDocs(newTestsBase);
    const existingTestIds = new Set(existingSnapshot.docs.map(d => d.id));
    
    let migratedCount = 0;
    
    for (const docSnapshot of historySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Skip if already exists in new collection
      if (existingTestIds.has(docSnapshot.id)) {
        console.log(`Test ${docSnapshot.id} already exists in new collection`);
        continue;
      }
      
      // Create in new collection with same ID
      const newTestRef = doc(db, `users/${uid}/tests/${docSnapshot.id}`);
      const testDoc = {
        userId: uid,
        testName: data.testName,
        fileName: data.fileName,
        fileType: data.fileType || 'txt',
        extractedText: data.extractedText || '',
        quizType: data.quizType,
        questions: data.questions || [],
        answers: data.answers || [],
        score: data.score,
        folderId: data.folderId || null,
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
        completedAt: data.completedAt
      };
      
      await setDoc(newTestRef, testDoc);
      console.log(`Migrated test: ${data.testName} (${docSnapshot.id})`);
      migratedCount++;
    }
    
    console.log(`Migration complete: ${migratedCount} tests migrated to single source of truth`);
    return migratedCount;
  } catch (error) {
    console.error('Error migrating to single source of truth:', error);
    throw error;
  }
}

// Temporary function to help diagnose and fix folder data inconsistency
export async function diagnoseAndFixFolderData(uid: string): Promise<{
  totalTests: number;
  testsWithFolders: number;
  testsWithoutFolders: number;
  uniqueFolderIds: string[];
  availableFolders: Array<{id: string, name: string}>;
}> {
  try {
    // Get all test history
    const testHistoryBase = collection(db, 'testHistory');
    const snapHistory = await getDocs(
      query(testHistoryBase, where('userId', '==', uid))
    );
    
    const allTests = snapHistory.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as any[];
    
    // Get available folders
    const folders = await getUserFolders(uid);
    
    // Analyze the data
    const testsWithFolders = allTests.filter(test => test.folderId && test.folderId !== '').length;
    const testsWithoutFolders = allTests.filter(test => !test.folderId || test.folderId === '').length;
    const uniqueFolderIds = [...new Set(allTests.map(test => test.folderId).filter(Boolean))];
    
    console.log('Folder Data Diagnosis:', {
      totalTests: allTests.length,
      testsWithFolders,
      testsWithoutFolders,
      uniqueFolderIds,
      availableFolders: folders,
      sampleTests: allTests.slice(0, 5).map(test => ({
        testName: test.testName,
        folderId: test.folderId,
        folderIdType: typeof test.folderId
      }))
    });
    
    return {
      totalTests: allTests.length,
      testsWithFolders,
      testsWithoutFolders,
      uniqueFolderIds,
      availableFolders: folders
    };
  } catch (error) {
    console.error('Error diagnosing folder data:', error);
    throw error;
  }
}
