import { getUserProfile, createUserProfile, updateUserPlan, ensureUserProfile, UserProfile } from '../userService';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { UserPlan, DEFAULT_PLAN } from '@/config/plans';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date('2024-01-01T00:00:00Z')),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

jest.mock('@/config/plans', () => ({
  DEFAULT_PLAN: 'free',
  UserPlan: {
    FREE: 'free',
    PRO: 'pro',
    ENTERPRISE: 'enterprise',
  },
}));

describe('userService', () => {
  const mockUid = 'test-user-123';
  const mockEmail = 'test@example.com';
  const mockDisplayName = 'Test User';
  const mockDate = new Date('2024-01-01T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    (serverTimestamp as jest.Mock).mockReturnValue(mockDate);
    
    // Mock Date constructor to return consistent dates
    const originalDate = global.Date;
    global.Date = jest.fn((...args) => {
      if (args.length === 0) {
        return mockDate;
      }
      return new originalDate(...args);
    }) as any;
  });

  afterEach(() => {
    // Restore original Date
    global.Date = Date;
  });

  describe('getUserProfile', () => {
    it('returns user profile when user exists', async () => {
      const mockUserData = {
        email: mockEmail,
        displayName: mockDisplayName,
        plan: 'pro' as UserPlan,
        createdAt: { toDate: () => mockDate },
        updatedAt: { toDate: () => mockDate },
      };

      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData,
      });

      const result = await getUserProfile(mockUid);

      expect(doc).toHaveBeenCalledWith({}, 'users', mockUid);
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
      expect(result).toEqual({
        uid: mockUid,
        email: mockEmail,
        displayName: mockDisplayName,
        plan: 'pro',
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });

    it('returns null when user does not exist', async () => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => ({}),
      });

      const result = await getUserProfile(mockUid);

      expect(result).toBeNull();
    });

    it('returns default values when data is missing', async () => {
      const mockUserData = {
        email: mockEmail,
        // Missing displayName, plan, createdAt, updatedAt
      };

      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData,
      });

      const result = await getUserProfile(mockUid);

      expect(result).toEqual({
        uid: mockUid,
        email: mockEmail,
        displayName: undefined,
        plan: 'free',
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });

    it('handles errors gracefully', async () => {
      const mockError = new Error('Firebase error');
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getUserProfile(mockUid);

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching user profile:', mockError);
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('createUserProfile', () => {
    it('creates user profile successfully', async () => {
      const mockDocRef = 'mock-doc-ref';
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await createUserProfile(mockUid, mockEmail, mockDisplayName);

      expect(doc).toHaveBeenCalledWith({}, 'users', mockUid);
      expect(setDoc).toHaveBeenCalledWith(mockDocRef, {
        email: mockEmail,
        displayName: mockDisplayName,
        plan: 'free',
        createdAt: mockDate,
        updatedAt: mockDate,
      });
      expect(result).toEqual({
        uid: mockUid,
        email: mockEmail,
        displayName: mockDisplayName,
        plan: 'free',
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });

    it('creates user profile without display name', async () => {
      const mockDocRef = 'mock-doc-ref';
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await createUserProfile(mockUid, mockEmail);

      expect(setDoc).toHaveBeenCalledWith(mockDocRef, {
        email: mockEmail,
        displayName: null,
        plan: 'free',
        createdAt: mockDate,
        updatedAt: mockDate,
      });
      expect(result.displayName).toBeUndefined();
    });

    it('throws error when creation fails', async () => {
      const mockError = new Error('Firebase error');
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (setDoc as jest.Mock).mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(createUserProfile(mockUid, mockEmail)).rejects.toThrow('Firebase error');
      expect(consoleSpy).toHaveBeenCalledWith('Error creating user profile:', mockError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('updateUserPlan', () => {
    it('updates user plan successfully', async () => {
      const mockDocRef = 'mock-doc-ref';
      const newPlan = 'pro' as UserPlan;
      
      (doc as jest.Mock).mockReturnValue(mockDocRef);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await updateUserPlan(mockUid, newPlan);

      expect(doc).toHaveBeenCalledWith({}, 'users', mockUid);
      expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
        plan: newPlan,
        updatedAt: mockDate,
      });
    });

    it('throws error when update fails', async () => {
      const mockError = new Error('Firebase error');
      const newPlan = 'pro' as UserPlan;
      
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (updateDoc as jest.Mock).mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(updateUserPlan(mockUid, newPlan)).rejects.toThrow('Firebase error');
      expect(consoleSpy).toHaveBeenCalledWith('Error updating user plan:', mockError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('ensureUserProfile', () => {
    it('returns existing profile when user exists', async () => {
      const existingProfile: UserProfile = {
        uid: mockUid,
        email: mockEmail,
        displayName: mockDisplayName,
        plan: 'pro' as UserPlan,
        createdAt: mockDate,
        updatedAt: mockDate,
      };

      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          email: mockEmail,
          displayName: mockDisplayName,
          plan: 'pro',
          createdAt: { toDate: () => mockDate },
          updatedAt: { toDate: () => mockDate },
        }),
      });

      const result = await ensureUserProfile(mockUid, mockEmail, mockDisplayName);

      expect(result).toEqual(existingProfile);
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('creates new profile when user does not exist', async () => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => ({}),
      });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      const result = await ensureUserProfile(mockUid, mockEmail, mockDisplayName);

      expect(result).toEqual({
        uid: mockUid,
        email: mockEmail,
        displayName: mockDisplayName,
        plan: 'free',
        createdAt: mockDate,
        updatedAt: mockDate,
      });
      expect(setDoc).toHaveBeenCalled();
    });

    it('handles creation error in ensureUserProfile', async () => {
      const mockError = new Error('Firebase error');
      
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => ({}),
      });
      (setDoc as jest.Mock).mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(ensureUserProfile(mockUid, mockEmail, mockDisplayName)).rejects.toThrow('Firebase error');
      
      consoleSpy.mockRestore();
    });
  });
});
