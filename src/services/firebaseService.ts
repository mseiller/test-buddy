import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
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
import { TestHistory, User, Folder } from '@/types';

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

  static async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || undefined,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign in with Google');
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

      console.log('Attempting to save test history for user:', testHistory.userId);
      const docRef = await addDoc(collection(db, 'testHistory'), testHistoryData);
      console.log('Test history saved successfully with ID:', docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error('Firestore save error:', error);
      
      // Try to provide more specific error information
      if (error.code === 'permission-denied') {
        console.error('Permission denied - check Firestore rules');
        throw new Error('Permission denied - unable to save test history');
      } else if (error.code === 'unavailable') {
        console.error('Firestore unavailable - network issue');
        throw new Error('Network error - unable to save test history');
      } else {
        console.error('Unknown Firestore error:', error.code, error.message);
        throw new Error('Failed to save test history: ' + error.message);
      }
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
          fileType: data.fileType || data.fileName.split('.').pop() || 'txt', // Default from filename
          extractedText: data.extractedText || '', // Default to empty string for existing data
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
      console.error('Firestore fetch error:', error);
      // Return empty array if Firestore is unavailable
      return [];
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
        fileType: data.fileType || data.fileName.split('.').pop() || 'txt', // Default from filename
        extractedText: data.extractedText || '', // Default to empty string for existing data
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

  // Test Firestore connectivity
  static async testFirestoreConnection(): Promise<boolean> {
    try {
      const testDoc = await addDoc(collection(db, 'test'), {
        test: true,
        timestamp: Timestamp.now(),
      });
      await deleteDoc(doc(db, 'test', testDoc.id));
      return true;
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      return false;
    }
  }

  // Folder management methods
  static async createFolder(userId: string, name: string, description?: string, color?: string): Promise<Folder> {
    try {
      const folderData = {
        userId,
        name,
        description: description || '',
        color: color || '#3B82F6', // Default blue color
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'folders'), folderData);
      return {
        id: docRef.id,
        ...folderData,
        createdAt: folderData.createdAt.toDate(),
        updatedAt: folderData.updatedAt.toDate(),
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create folder');
    }
  }

  static async getUserFolders(userId: string): Promise<Folder[]> {
    try {
      const foldersQuery = query(
        collection(db, 'folders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(foldersQuery);
      const folders: Folder[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        folders.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          description: data.description,
          color: data.color,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return folders;
    } catch (error: any) {
      console.error('Firestore fetch error:', error);
      return [];
    }
  }

  static async updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
    try {
      const folderRef = doc(db, 'folders', folderId);
      const updateData: any = { ...updates };

      // Convert Date objects to Timestamps
      if (updateData.createdAt) {
        updateData.createdAt = Timestamp.fromDate(updateData.createdAt);
      }
      if (updateData.updatedAt) {
        updateData.updatedAt = Timestamp.now(); // Always update the updatedAt timestamp
      }

      await updateDoc(folderRef, updateData);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update folder');
    }
  }

  static async deleteFolder(folderId: string): Promise<void> {
    try {
      const folderRef = doc(db, 'folders', folderId);
      await deleteDoc(folderRef);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete folder');
    }
  }

  static async moveTestToFolder(testId: string, folderId: string | null): Promise<void> {
    try {
      const testRef = doc(db, 'testHistory', testId);
      await updateDoc(testRef, { folderId });
    } catch (error: any) {
      throw new Error(error.message || 'Failed to move test to folder');
    }
  }

  static async getTestsInFolder(userId: string, folderId: string): Promise<TestHistory[]> {
    try {
      const testsQuery = query(
        collection(db, 'testHistory'),
        where('userId', '==', userId),
        where('folderId', '==', folderId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(testsQuery);
      const tests: TestHistory[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        tests.push({
          id: doc.id,
          userId: data.userId,
          testName: data.testName,
          fileName: data.fileName,
          fileType: data.fileType || data.fileName.split('.').pop() || 'txt',
          extractedText: data.extractedText || '',
          quizType: data.quizType,
          questions: data.questions,
          answers: data.answers,
          score: data.score,
          createdAt: data.createdAt.toDate(),
          completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
          folderId: data.folderId,
        });
      });

      return tests;
    } catch (error: any) {
      console.error('Firestore fetch error:', error);
      return [];
    }
  }
} 