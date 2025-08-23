import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
    const base = collection(db, `users/${uid}/results`);

    // All results (cap to last 500 to bound cost)
    const snapAll = await getDocs(query(base, orderBy('createdAt', 'desc'), limit(500)));
    const all = snapAll.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Last 30 days
    const snap30 = await getDocs(
      query(base, where('createdAt', '>=', Timestamp.fromDate(daysAgo(30))))
    );
    const last30 = snap30.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

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
