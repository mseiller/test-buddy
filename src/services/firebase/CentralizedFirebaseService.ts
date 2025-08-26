/**
 * Centralized Firebase Service
 * Provides a unified interface for all Firebase operations with consistent error handling,
 * retry logic, data validation, and transaction support
 */

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
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  runTransaction,
  serverTimestamp,
  limit,
  startAfter,
  DocumentSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { TestHistory, User, Folder } from '@/types';
import { UserPlan } from '@/config/plans';
import { FirebaseError, FirebaseErrorCode } from './FirebaseError';
import { FirebaseRetry, RetryOptions } from './FirebaseRetry';
import { FirebaseValidation } from './FirebaseValidation';

export interface PaginationOptions {
  pageSize?: number;
  lastDoc?: DocumentSnapshot;
}

export interface QueryOptions {
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  limitCount?: number;
  filters?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
    value: any;
  }>;
}

export class CentralizedFirebaseService {
  private static readonly DEFAULT_RETRY_OPTIONS: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    timeout: 30000,
  };

  // ========================================
  // AUTHENTICATION METHODS
  // ========================================

  /**
   * Sign up a new user
   */
  static async signUp(
    email: string,
    password: string,
    displayName?: string,
    retryOptions?: RetryOptions
  ): Promise<User> {
    return FirebaseRetry.execute(
      async () => {
        // Validate input
        FirebaseValidation.validateEmail(email);
        FirebaseValidation.validatePassword(password);

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
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'User sign up'
    );
  }

  /**
   * Sign in an existing user
   */
  static async signIn(
    email: string,
    password: string,
    retryOptions?: RetryOptions
  ): Promise<User> {
    return FirebaseRetry.execute(
      async () => {
        // Validate input
        FirebaseValidation.validateEmail(email);
        FirebaseValidation.validatePassword(password);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
        };
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'User sign in'
    );
  }

  /**
   * Sign in with Google
   */
  static async signInWithGoogle(retryOptions?: RetryOptions): Promise<User> {
    return FirebaseRetry.execute(
      async () => {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        return {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
        };
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Google sign in'
    );
  }

  /**
   * Sign out current user
   */
  static async signOut(retryOptions?: RetryOptions): Promise<void> {
    return FirebaseRetry.execute(
      () => signOut(auth),
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'User sign out'
    );
  }

  // ========================================
  // USER PROFILE METHODS
  // ========================================

  /**
   * Get user profile
   */
  static async getUserProfile(
    userId: string,
    retryOptions?: RetryOptions
  ): Promise<User | null> {
    return FirebaseRetry.execute(
      async () => {
        FirebaseValidation.validateUserId(userId);

        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (!userDoc.exists()) {
          return null;
        }

        const data = userDoc.data();
        return {
          uid: userId,
          email: data.email,
          displayName: data.displayName,
          plan: data.plan || 'free',
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Get user profile'
    );
  }

  /**
   * Create user profile
   */
  static async createUserProfile(
    userId: string,
    email: string,
    displayName?: string,
    plan: UserPlan = 'free',
    retryOptions?: RetryOptions
  ): Promise<User> {
    return FirebaseRetry.execute(
      async () => {
        FirebaseValidation.validateUserId(userId);
        FirebaseValidation.validateEmail(email);

        const userData = FirebaseValidation.sanitizeForFirestore({
          email,
          displayName,
          plan,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, userData);

        return {
          uid: userId,
          email,
          displayName,
          plan,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Create user profile'
    );
  }

  /**
   * Update user plan
   */
  static async updateUserPlan(
    userId: string,
    plan: UserPlan,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return FirebaseRetry.execute(
      async () => {
        FirebaseValidation.validateUserId(userId);

        const updateData = FirebaseValidation.sanitizeForFirestore({
          plan,
          updatedAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'users', userId), updateData);
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Update user plan'
    );
  }

  // ========================================
  // TEST HISTORY METHODS
  // ========================================

  /**
   * Save test history with transaction support
   */
  static async saveTestHistory(
    testHistory: Omit<TestHistory, 'id'>,
    retryOptions?: RetryOptions
  ): Promise<string> {
    return FirebaseRetry.execute(
      async () => {
        // Validate data
        FirebaseValidation.validateTestHistory(testHistory);

        // Sanitize data for Firestore
        const sanitizedData = FirebaseValidation.sanitizeForFirestore({
          ...testHistory,
          createdAt: testHistory.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Use transaction to ensure data consistency
        const docRef = await runTransaction(db, async (transaction) => {
          const testHistoryRef = doc(collection(db, 'testHistory'));
          transaction.set(testHistoryRef, sanitizedData);
          
          // Also save to user's test collection for better querying
          const userTestRef = doc(collection(db, `users/${testHistory.userId}/tests`));
          transaction.set(userTestRef, sanitizedData);
          
          return testHistoryRef;
        });

        return docRef.id;
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Save test history'
    );
  }

  /**
   * Get user test history with pagination
   */
  static async getUserTestHistory(
    userId: string,
    options: QueryOptions & PaginationOptions = {},
    retryOptions?: RetryOptions
  ): Promise<{ tests: TestHistory[]; hasMore: boolean; lastDoc?: DocumentSnapshot }> {
    return FirebaseRetry.execute(
      async () => {
        FirebaseValidation.validateUserId(userId);

        const {
          orderByField = 'createdAt',
          orderDirection = 'desc',
          limitCount = 20,
          filters = [],
          pageSize = 20,
          lastDoc
        } = options;

        // Build query constraints
        const constraints: QueryConstraint[] = [
          where('userId', '==', userId),
          orderBy(orderByField, orderDirection),
          limit(pageSize)
        ];

        // Add filters
        filters.forEach(filter => {
          constraints.push(where(filter.field, filter.operator, filter.value));
        });

        // Add pagination
        if (lastDoc) {
          constraints.push(startAfter(lastDoc));
        }

        const q = query(collection(db, `users/${userId}/tests`), ...constraints);
        const querySnapshot = await getDocs(q);

        const tests: TestHistory[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          tests.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate(),
          } as TestHistory);
        });

        return {
          tests,
          hasMore: querySnapshot.docs.length === pageSize,
          lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
        };
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Get user test history'
    );
  }

  /**
   * Delete test history
   */
  static async deleteTestHistory(
    testId: string,
    userId: string,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return FirebaseRetry.execute(
      async () => {
        FirebaseValidation.validateUserId(userId);

        // Use transaction to delete from both collections
        await runTransaction(db, async (transaction) => {
          transaction.delete(doc(db, 'testHistory', testId));
          transaction.delete(doc(db, `users/${userId}/tests`, testId));
        });
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Delete test history'
    );
  }

  // ========================================
  // FOLDER METHODS
  // ========================================

  /**
   * Create folder
   */
  static async createFolder(
    userId: string,
    name: string,
    description?: string,
    color?: string,
    retryOptions?: RetryOptions
  ): Promise<Folder> {
    return FirebaseRetry.execute(
      async () => {
        const folderData = { userId, name, description, color };
        FirebaseValidation.validateFolder(folderData);

        const sanitizedData = FirebaseValidation.sanitizeForFirestore({
          ...folderData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const docRef = await addDoc(collection(db, 'folders'), sanitizedData);

        return {
          id: docRef.id,
          userId,
          name,
          description,
          color,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Create folder'
    );
  }

  /**
   * Get user folders
   */
  static async getUserFolders(
    userId: string,
    retryOptions?: RetryOptions
  ): Promise<Folder[]> {
    return FirebaseRetry.execute(
      async () => {
        FirebaseValidation.validateUserId(userId);

        const q = query(
          collection(db, 'folders'),
          where('userId', '==', userId),
          orderBy('name')
        );

        const querySnapshot = await getDocs(q);
        const folders: Folder[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          folders.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Folder);
        });

        return folders;
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Get user folders'
    );
  }

  /**
   * Update folder
   */
  static async updateFolder(
    folderId: string,
    updates: Partial<Pick<Folder, 'name' | 'description' | 'color'>>,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return FirebaseRetry.execute(
      async () => {
        const updateData = FirebaseValidation.sanitizeForFirestore({
          ...updates,
          updatedAt: serverTimestamp(),
        });

        await updateDoc(doc(db, 'folders', folderId), updateData);
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Update folder'
    );
  }

  /**
   * Delete folder
   */
  static async deleteFolder(
    folderId: string,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return FirebaseRetry.execute(
      async () => {
        await deleteDoc(doc(db, 'folders', folderId));
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Delete folder'
    );
  }

  // ========================================
  // BATCH OPERATIONS
  // ========================================

  /**
   * Batch write multiple operations
   */
  static async batchWrite(
    operations: Array<{
      type: 'set' | 'update' | 'delete';
      collection: string;
      docId?: string;
      data?: any;
    }>,
    retryOptions?: RetryOptions
  ): Promise<void> {
    return FirebaseRetry.execute(
      async () => {
        const batch = writeBatch(db);

        operations.forEach(({ type, collection: collectionName, docId, data }) => {
          const docRef = docId 
            ? doc(db, collectionName, docId)
            : doc(collection(db, collectionName));

          switch (type) {
            case 'set':
              if (!data) throw new Error('Data is required for set operations');
              batch.set(docRef, FirebaseValidation.sanitizeForFirestore(data));
              break;
            case 'update':
              if (!data) throw new Error('Data is required for update operations');
              batch.update(docRef, FirebaseValidation.sanitizeForFirestore(data));
              break;
            case 'delete':
              batch.delete(docRef);
              break;
          }
        });

        await batch.commit();
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Batch write operations'
    );
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Check if document exists
   */
  static async documentExists(
    collectionPath: string,
    docId: string,
    retryOptions?: RetryOptions
  ): Promise<boolean> {
    return FirebaseRetry.execute(
      async () => {
        const docRef = doc(db, collectionPath, docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Check document existence'
    );
  }

  /**
   * Get collection size
   */
  static async getCollectionSize(
    collectionPath: string,
    filters: Array<{ field: string; operator: any; value: any }> = [],
    retryOptions?: RetryOptions
  ): Promise<number> {
    return FirebaseRetry.execute(
      async () => {
        const constraints: QueryConstraint[] = filters.map(filter => 
          where(filter.field, filter.operator, filter.value)
        );

        const q = query(collection(db, collectionPath), ...constraints);
        const snapshot = await getDocs(q);
        return snapshot.size;
      },
      { ...this.DEFAULT_RETRY_OPTIONS, ...retryOptions },
      'Get collection size'
    );
  }

  /**
   * Health check - verify Firebase connection
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: string }> {
    try {
      // Try a simple read operation
      await getDoc(doc(db, 'health', 'check'));
      return { status: 'healthy', details: 'Firebase connection is working' };
    } catch (error) {
      const firebaseError = FirebaseError.fromFirebaseError(error);
      return { 
        status: 'unhealthy', 
        details: `Firebase connection failed: ${firebaseError.getUserFriendlyMessage()}` 
      };
    }
  }
}
