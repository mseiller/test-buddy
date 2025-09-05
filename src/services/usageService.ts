import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserPlan, getPlanFeatures } from '@/config/plans';

export interface UsageRecord {
  monthId: string; // Format: "2024-01"
  testsGenerated: number;
  createdAt: Date;
  updatedAt: Date;
}

// Generate month ID from current date
export function getCurrentMonthId(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get current usage for a user
export async function getUserUsage(uid: string, monthId?: string): Promise<UsageRecord | null> {
  const currentMonthId = monthId || getCurrentMonthId();
  
  try {
    const usageDoc = await getDoc(doc(db, `users/${uid}/usage/${currentMonthId}`));
    
    if (!usageDoc.exists()) {
      return {
        monthId: currentMonthId,
        testsGenerated: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    const data = usageDoc.data();
    return {
      monthId: currentMonthId,
      testsGenerated: data.testsGenerated || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching usage:', error);
    return null;
  }
}

// Check if user can generate a test
export async function canGenerateTest(uid: string, plan: UserPlan): Promise<{
  allowed: boolean;
  usage: UsageRecord | null;
  limit: number;
  remaining: number;
}> {
  const planFeatures = getPlanFeatures(plan);
  const usage = await getUserUsage(uid);
  
  if (!usage) {
    return {
      allowed: false,
      usage: null,
      limit: planFeatures.maxTestsPerMonth,
      remaining: 0,
    };
  }
  
  const limit = planFeatures.maxTestsPerMonth;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - usage.testsGenerated);
  const allowed = limit === Infinity || usage.testsGenerated < limit;
  
  return {
    allowed,
    usage,
    limit,
    remaining,
  };
}

// Increment test generation count
export async function incrementTestUsage(uid: string): Promise<UsageRecord> {
  const monthId = getCurrentMonthId();
  const usageRef = doc(db, `users/${uid}/usage/${monthId}`);
  
  try {
    // Try to increment existing document
    const existingDoc = await getDoc(usageRef);
    
    if (existingDoc.exists()) {
      await updateDoc(usageRef, {
        testsGenerated: increment(1),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new document
      await setDoc(usageRef, {
        testsGenerated: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    
    // Return updated usage
    const updatedUsage = await getUserUsage(uid, monthId);
    return updatedUsage!;
  } catch (error) {
    console.error('Error incrementing test usage:', error);
    throw error;
  }
}

// Get usage summary for analytics
export async function getUsageSummary(uid: string): Promise<{
  currentMonth: UsageRecord | null;
  lastMonth: UsageRecord | null;
}> {
  const currentMonthId = getCurrentMonthId();
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthId = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  const [currentMonth, lastMonthUsage] = await Promise.all([
    getUserUsage(uid, currentMonthId),
    getUserUsage(uid, lastMonthId),
  ]);
  
  return {
    currentMonth,
    lastMonth: lastMonthUsage,
  };
}
