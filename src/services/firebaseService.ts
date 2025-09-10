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

      await logger.info('Attempting to save test history', 'firebase', { userId: testHistory.userId });
      const docRef = await addDoc(collection(db, 'testHistory'), testHistoryData);
      await logger.info('Test history saved successfully', 'firebase', { docId: docRef.id, userId: testHistory.userId });
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
      // Temporarily remove orderBy to avoid index requirement
      const q = query(
        collection(db, 'testHistory'),
        where('userId', '==', userId)
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

      // Sort by createdAt descending (client-side sorting while index builds)
      testHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        console.log('No authenticated user for Firestore connection test');
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
      console.error('Firestore connection test failed:', error);
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
      console.error('Error getting folder by ID:', error);
      return null;
    }
  }

  static async createFolder(userId: string, name: string, description?: string, color?: string): Promise<Folder> {
    try {
      console.log('Creating folder in Firestore:', { userId, name, description, color });
      const folderData = {
        userId,
        name,
        description: description || '',
        color: color || '#3B82F6', // Default blue color
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      console.log('Folder data to save:', folderData);
      const docRef = await addDoc(collection(db, 'folders'), folderData);
      console.log('Folder created with ID:', docRef.id);
      
      const result = {
        id: docRef.id,
        ...folderData,
        createdAt: folderData.createdAt.toDate(),
        updatedAt: folderData.updatedAt.toDate(),
      };
      
      console.log('Returning folder result:', result);
      return result;
    } catch (error: any) {
      console.error('Error creating folder:', error);
      throw new Error(error.message || 'Failed to create folder');
    }
  }

  static async getUserFolders(userId: string): Promise<Folder[]> {
    try {
      // Temporarily remove orderBy while index is building
      const foldersQuery = query(
        collection(db, 'folders'),
        where('userId', '==', userId)
        // orderBy('createdAt', 'desc') // Temporarily disabled while index builds
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

      // Sort by createdAt descending (client-side sorting while index builds)
      folders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
      // Update both collections for backward compatibility during transition
      const testRef = doc(db, 'testHistory', testId);
      await updateDoc(testRef, { folderId });
      
      // Also try to update in new collection if it exists
      // We'll need the userId for this, so let's get it from the test
      const testDoc = await getDoc(testRef);
      if (testDoc.exists()) {
        const data = testDoc.data();
        if (data.userId) {
          try {
            const newTestRef = doc(db, `users/${data.userId}/tests/${testId}`);
            const newTestDoc = await getDoc(newTestRef);
            if (newTestDoc.exists()) {
              await updateDoc(newTestRef, { folderId, updatedAt: new Date() });
              console.log(`Updated test in new collection: ${testId} -> folder ${folderId}`);
            }
          } catch (newCollectionError) {
            console.log('Test not found in new collection, only updated legacy collection');
          }
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to move test to folder');
    }
  }

  static async getTestsInFolder(userId: string, folderId: string): Promise<TestHistory[]> {
    try {
      // Temporarily remove orderBy to avoid index requirement
      const testsQuery = query(
        collection(db, 'testHistory'),
        where('userId', '==', userId),
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
          createdAt: data.createdAt.toDate(),
          completedAt: data.completedAt ? data.completedAt.toDate() : undefined,
          folderId: data.folderId,
        });
      });

      // Sort by createdAt descending (client-side sorting while index builds)
      tests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return tests;
    } catch (error: any) {
      console.error('Firestore fetch error:', error);
      return [];
    }
  }
} 