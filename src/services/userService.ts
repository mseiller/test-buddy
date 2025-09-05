import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { UserPlan, DEFAULT_PLAN } from '@/config/plans';

export interface UserProfile extends User {
  plan: UserPlan;
  createdAt: Date;
  updatedAt: Date;
}

// Get user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const data = userDoc.data();
    return {
      uid,
      email: data.email,
      displayName: data.displayName,
      plan: data.plan || DEFAULT_PLAN,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Create user profile in Firestore
export async function createUserProfile(
  uid: string, 
  email: string, 
  displayName?: string
): Promise<UserProfile> {
  const userData = {
    email,
    displayName: displayName || null,
    plan: DEFAULT_PLAN,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  try {
    await setDoc(doc(db, 'users', uid), userData);
    
    return {
      uid,
      email,
      displayName,
      plan: DEFAULT_PLAN,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserProfile;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

// Update user plan
export async function updateUserPlan(uid: string, plan: UserPlan): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      plan,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating user plan:', error);
    throw error;
  }
}

// Ensure user profile exists (call on login)
export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<UserProfile> {
  let profile = await getUserProfile(uid);
  
  if (!profile) {
    profile = await createUserProfile(uid, email, displayName);
  }
  
  return profile;
}
