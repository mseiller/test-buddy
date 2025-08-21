import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { TestHistory, User } from '@/types';

export class FirebaseService {
  // Authentication methods
  static async signUp(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      return {
        uid: user.uid,
        email: user.email || '',
        displayName: displayName || user.displayName || undefined,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create account');
    }
  }

  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || undefined,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in');
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  static onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  // Test history methods
  static async saveTestHistory(testHistory: Omit<TestHistory, 'id'>): Promise<string> {
    try {
      const testHistoryData = {
        ...testHistory,
        createdAt: Timestamp.fromDate(testHistory.createdAt),
        completedAt: testHistory.completedAt ? Timestamp.fromDate(testHistory.completedAt) : null,
      };

      const docRef = await addDoc(collection(db, 'testHistory'), testHistoryData);
      return docRef.id;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save test history');
    }
  }

  static async getUserTestHistory(userId: string): Promise<TestHistory[]> {
    try {
      const q = query(
        collection(db, 'testHistory'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const testHistory: TestHistory[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        testHistory.push({
          id: doc.id,
          userId: data.userId,
          testName: data.testName,
          fileName: data.fileName,
          quizType: data.quizType,
          questions: data.questions,
          answers: data.answers,
          score: data.score,
          createdAt: data.createdAt.toDate(),
          completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
        });
      });

      return testHistory;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch test history');
    }
  }

  static async updateTestHistory(testId: string, updates: Partial<TestHistory>): Promise<void> {
    try {
      const testRef = doc(db, 'testHistory', testId);
      const updateData: any = { ...updates };

      // Convert Date objects to Timestamps
      if (updateData.createdAt) {
        updateData.createdAt = Timestamp.fromDate(updateData.createdAt);
      }
      if (updateData.completedAt) {
        updateData.completedAt = Timestamp.fromDate(updateData.completedAt);
      }

      await updateDoc(testRef, updateData);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update test history');
    }
  }

  static async deleteTestHistory(testId: string): Promise<void> {
    try {
      const testRef = doc(db, 'testHistory', testId);
      await deleteDoc(testRef);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete test history');
    }
  }

  static async getTestById(testId: string): Promise<TestHistory | null> {
    try {
      const testRef = doc(db, 'testHistory', testId);
      const testSnap = await getDocs(query(collection(db, 'testHistory'), where('__name__', '==', testId)));
      
      if (testSnap.empty) {
        return null;
      }

      const data = testSnap.docs[0].data();
      return {
        id: testSnap.docs[0].id,
        userId: data.userId,
        testName: data.testName,
        fileName: data.fileName,
        quizType: data.quizType,
        questions: data.questions,
        answers: data.answers,
        score: data.score,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch test');
    }
  }

  // Utility methods
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  static async getCurrentUserData(): Promise<User | null> {
    const firebaseUser = this.getCurrentUser();
    if (!firebaseUser) return null;

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || undefined,
    };
  }
} 