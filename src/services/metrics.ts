import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logResult } from './results';

const now = () => new Date();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

export interface UserMetrics {
  quizzesTaken: number;
  quizzesTaken30: number;
  avgScore: number;
  avgLast5: number;
  trend: Array<{ t: Date; score: number }>;
  retakeDelta: number;
}

export async function getUserMetrics(uid: string): Promise<UserMetrics> {
  try {
    // Get data from both new results collection and legacy testHistory collection
    const resultsBase = collection(db, `users/${uid}/results`);
    const testHistoryBase = collection(db, 'testHistory');

    // Get new results data
    const snapResults = await getDocs(query(resultsBase, orderBy('createdAt', 'desc'), limit(500)));
    const resultsData = snapResults.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

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

    // Combine and sort all data by creation date
    const all = [...resultsData, ...historyData]
      .filter(item => item.score != null && !isNaN(item.score)) // Only include completed tests with scores
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime.getTime() - aTime.getTime(); // Newest first
      })
      .slice(0, 500); // Limit total results

    // Filter for last 30 days from combined data
    const thirtyDaysAgo = daysAgo(30);
    const last30 = all.filter(item => {
      const itemDate = item.createdAt?.toDate?.() || new Date(item.createdAt);
      return itemDate >= thirtyDaysAgo;
    });

    // Derive metrics
    const quizzesTaken = all.length;
    const quizzesTaken30 = last30.length;

    const scores = all.map(r => Number(r.score)).filter(x => !isNaN(x));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const last5 = scores.slice(0, 5);
    const avgLast5 = last5.length ? Math.round(last5.reduce((a, b) => a + b, 0) / last5.length) : 0;

    const trend = all.slice(0, 10).map(r => ({
      t: r.createdAt?.toDate?.() ?? now(),
      score: r.score
    })).reverse(); // oldest → newest for charts

    // Retake delta: for results with retakeOf, compare to their originals
    const originals = new Map(all.map(r => [r.id, r]));
    const deltas: number[] = [];
    for (const r of all) {
      if (r.retakeOf && originals.has(r.retakeOf)) {
        const orig = originals.get(r.retakeOf);
        if (orig?.score != null && r.score != null) {
          deltas.push(r.score - orig.score);
        }
      }
    }
    const retakeDelta = deltas.length ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0;

    return {
      quizzesTaken,
      quizzesTaken30,
      avgScore: avg,
      avgLast5,
      trend,
      retakeDelta,
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
    const existingResults = new Set(snapResults.docs.map(d => d.data().testName + '_' + d.data().createdAt?.seconds));
    
    let migratedCount = 0;
    
    for (const doc of snapHistory.docs) {
      const data = doc.data();
      
      // Skip if no score (incomplete test) or already migrated
      if (data.score == null || isNaN(data.score)) continue;
      
      const uniqueKey = data.testName + '_' + (data.completedAt?.seconds || data.createdAt?.seconds);
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
