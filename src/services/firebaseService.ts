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
  getDoc,
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
import { logger } from './logger';
import { safeConsole } from '@/utils/console';

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
      // Provide user-friendly error messages
      switch (error.code) {
        case 'auth/email-already-in-use':
          throw new Error('An account with this email already exists. Please sign in instead.');
        case 'auth/invalid-email':
          throw new Error('Please enter a valid email address.');
        case 'auth/weak-password':
          throw new Error('Password should be at least 6 characters long.');
        case 'auth/operation-not-allowed':
          throw new Error('Account creation is currently disabled. Please contact support.');
        default:
          throw new Error(error.message || 'Failed to create account. Please try again.');
      }
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
      // Provide user-friendly error messages
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          throw new Error('User not found. Please check your email and password, or sign up for a new account.');
        case 'auth/invalid-email':
          throw new Error('Please enter a valid email address.');
        case 'auth/user-disabled':
          throw new Error('This account has been disabled. Please contact support.');
        case 'auth/too-many-requests':
          throw new Error('Too many failed attempts. Please try again later.');
        default:
          throw new Error(error.message || 'Failed to sign in. Please try again.');
      }
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
      // Build the data object with only defined fields
      const testHistoryData: any = {
        userId: testHistory.userId,
        testName: testHistory.testName,
        fileName: testHistory.fileName,
        quizType: testHistory.quizType,
        questions: testHistory.questions,
        answers: testHistory.answers,
        createdAt: Timestamp.fromDate(testHistory.createdAt),
      };

      // Only add optional fields if they have values
      if (testHistory.fileType) {
        testHistoryData.fileType = testHistory.fileType;
      }
      if (testHistory.extractedText) {
        testHistoryData.extractedText = testHistory.extractedText;
      }
      if (testHistory.score !== undefined && testHistory.score !== null) {
        testHistoryData.score = testHistory.score;
      }
      if (testHistory.completedAt) {
        testHistoryData.completedAt = Timestamp.fromDate(testHistory.completedAt);
      }
      if (testHistory.folderId) {
        testHistoryData.folderId = testHistory.folderId;
      }

      await logger.info('Attempting to save test history', 'firebase', {}, testHistory.userId);
      // Save directly to the new collection structure that the UI reads from
      const docRef = await addDoc(collection(db, `users/${testHistory.userId}/tests`), testHistoryData);
      await logger.info('Test history saved successfully', 'firebase', { docId: docRef.id }, testHistory.userId);
      return docRef.id;
    } catch (error: any) {
      safeConsole.error('Firestore save error:', error);
      
      // Try to provide more specific error information
      if (error.code === 'permission-denied') {
        safeConsole.error('Permission denied - check Firestore rules');
        throw new Error('Permission denied - unable to save test history');
      } else if (error.code === 'unavailable') {
        safeConsole.error('Firestore unavailable - network issue');
        throw new Error('Network error - unable to save test history');
      } else {
        safeConsole.error('Unknown Firestore error:', error.code, error.message);
        throw new Error('Failed to save test history: ' + error.message);
      }
    }
  }

  static async getUserTestHistory(userId: string): Promise<TestHistory[]> {
    try {
      // Use the new collection structure
      const q = query(
        collection(db, `users/${userId}/tests`)
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
          createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate(),
          completedAt: data.completedAt ? (data.completedAt instanceof Date ? data.completedAt : data.completedAt.toDate()) : undefined,
          folderId: data.folderId,
        });
      });

      // Sort by createdAt descending (client-side sorting while index builds)
      testHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return testHistory;
    } catch (error: any) {
      safeConsole.error('Firestore fetch error:', error);
      // Return empty array if Firestore is unavailable
      return [];
    }
  }

  static async updateTestHistory(testId: string, updates: Partial<TestHistory>): Promise<void> {
    try {
      // Find the test in the new collection structure
      // We need to search across all user collections since we don't know which user owns this test
      // For now, we'll need the userId parameter - this method signature needs to be updated
      throw new Error('updateTestHistory method needs to be updated to include userId parameter');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update test history');
    }
  }

  static async deleteTestHistory(testId: string): Promise<void> {
    try {
      // Find the test in the new collection structure
      // We need to search across all user collections since we don't know which user owns this test
      // For now, we'll need the userId parameter - this method signature needs to be updated
      throw new Error('deleteTestHistory method needs to be updated to include userId parameter');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete test history');
    }
  }

  static async getTestById(testId: string): Promise<TestHistory | null> {
    try {
      // Find the test in the new collection structure
      // We need to search across all user collections since we don't know which user owns this test
      // For now, we'll need the userId parameter - this method signature needs to be updated
      throw new Error('getTestById method needs to be updated to include userId parameter');
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
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        safeConsole.log('No authenticated user for Firestore connection test');
        return false;
      }
      
      // Test with a path that's allowed by security rules
      const testDoc = await addDoc(collection(db, `users/${currentUser.uid}/tests`), {
        test: true,
        timestamp: Timestamp.now(),
        userId: currentUser.uid,
        testName: 'Connection Test',
        fileName: 'test.txt',
        quizType: 'MCQ',
        questions: [],
        answers: [],
        createdAt: Timestamp.now(),
      });
      await deleteDoc(doc(db, `users/${currentUser.uid}/tests`, testDoc.id));
      return true;
    } catch (error) {
      safeConsole.error('Firestore connection test failed:', error);
      return false;
    }
  }

  // Folder management methods
  static async getFolderById(folderId: string): Promise<Folder | null> {
    try {
      const folderDoc = await getDoc(doc(db, 'folders', folderId));
      if (folderDoc.exists()) {
        const data = folderDoc.data();
        return {
          id: folderDoc.id,
          userId: data.userId,
          name: data.name,
          description: data.description,
          color: data.color,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        };
      }
      return null;
    } catch (error: any) {
      safeConsole.error('Error getting folder by ID:', error);
      return null;
    }
  }

  static async createFolder(userId: string, name: string, description?: string, color?: string): Promise<Folder> {
    try {
      safeConsole.log('Creating folder in Firestore:', { userId, name, description, color });
      const folderData = {
        userId,
        name,
        description: description || '',
        color: color || '#3B82F6', // Default blue color
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      safeConsole.log('Folder data to save:', folderData);
      const docRef = await addDoc(collection(db, 'folders'), folderData);
      safeConsole.log('Folder created with ID:', docRef.id);
      
      const result = {
        id: docRef.id,
        ...folderData,
        createdAt: folderData.createdAt.toDate(),
        updatedAt: folderData.updatedAt.toDate(),
      };
      
      safeConsole.log('Returning folder result:', result);
      return result;
    } catch (error: any) {
      safeConsole.error('Error creating folder:', error);
      throw new Error(error.message || 'Failed to create folder');
    }
  }

  static async getUserFolders(userId: string): Promise<Folder[]> {
    try {
      safeConsole.log('🔍 Getting folders for user:', userId);
      safeConsole.log('🔍 Using Firebase project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
      
      // Temporarily remove orderBy while index is building
      const foldersQuery = query(
        collection(db, 'folders'),
        where('userId', '==', userId)
        // orderBy('createdAt', 'desc') // Temporarily disabled while index builds
      );
      
      safeConsole.log('🔍 Executing folders query...');
      const querySnapshot = await getDocs(foldersQuery);
      safeConsole.log('🔍 Query snapshot size:', querySnapshot.size);
      
      const folders: Folder[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        safeConsole.log('🔍 Found folder:', doc.id, data.name);
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

      // Sort by createdAt descending (client-side sorting while index builds)
      folders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      safeConsole.log('🔍 Returning folders:', folders.length);
      return folders;
    } catch (error: any) {
      safeConsole.error('Firestore fetch error:', error);
      safeConsole.error('Error details:', error.message);
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
      // Find the test in the new collection structure
      // We need to search across all user collections since we don't know which user owns this test
      // For now, we'll need the userId parameter - this method signature needs to be updated
      throw new Error('moveTestToFolder method needs to be updated to include userId parameter');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to move test to folder');
    }
  }

  static async getTestsInFolder(userId: string, folderId: string): Promise<TestHistory[]> {
    try {
      // Use the new collection structure
      const testsQuery = query(
        collection(db, `users/${userId}/tests`),
        where('folderId', '==', folderId)
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
          createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate(),
          completedAt: data.completedAt ? (data.completedAt instanceof Date ? data.completedAt : data.completedAt.toDate()) : undefined,
          folderId: data.folderId,
        });
      });

      // Sort by createdAt descending (client-side sorting while index builds)
      tests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return tests;
    } catch (error: any) {
      safeConsole.error('Firestore fetch error:', error);
      return [];
    }
  }
} 