import { 
  getUserUsage, 
  canGenerateTest, 
  incrementTestUsage, 
  getUsageSummary,
  UsageRecord 
} from '../usageService';
import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { UserPlan } from '../../config/plans';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn((value) => value),
  serverTimestamp: jest.fn(() => new Date('2024-01-01T00:00:00Z')),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

jest.mock('../../config/plans', () => ({
  getPlanFeatures: jest.fn((plan: UserPlan) => ({
    maxTestsPerMonth: plan === 'free' ? 10 : plan === 'pro' ? 100 : Infinity,
  })),
}));

describe('usageService', () => {
  const mockUid = 'test-user-123';
  const mockMonthId = '2024-01';
  const mockDate = new Date('2024-01-01T00:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    (serverTimestamp as jest.Mock).mockReturnValue(mockDate);
    (increment as jest.Mock).mockReturnValue(1);
  });

  describe('getUserUsage', () => {
    it('returns usage record when it exists', async () => {
      const mockUsageData = {
        testsGenerated: 5,
        createdAt: { toDate: () => mockDate },
        updatedAt: { toDate: () => mockDate },
      };

      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUsageData,
      });

      const result = await getUserUsage(mockUid, mockMonthId);

      expect(doc).toHaveBeenCalledWith({}, `users/${mockUid}/usage/${mockMonthId}`);
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
      expect(result).toEqual({
        monthId: mockMonthId,
        testsGenerated: 5,
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });

    it('returns default usage record when it does not exist', async () => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
        data: () => ({}),
      });

      const result = await getUserUsage(mockUid, mockMonthId);

      expect(result).toEqual({
        monthId: mockMonthId,
        testsGenerated: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('handles errors gracefully', async () => {
      const mockError = new Error('Firebase error');
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await getUserUsage(mockUid, mockMonthId);

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching usage:', mockError);
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe('canGenerateTest', () => {
    it('prevents test generation when at limit', async () => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          testsGenerated: 10,
          createdAt: { toDate: () => mockDate },
          updatedAt: { toDate: () => mockDate },
        }),
      });

      const result = await canGenerateTest(mockUid, 'free');

      expect(result).toEqual({
        allowed: false,
        usage: expect.objectContaining({ testsGenerated: 10 }),
        limit: 10,
        remaining: 0,
      });
    });

    it('allows unlimited tests for enterprise plan', async () => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          testsGenerated: 1000,
          createdAt: { toDate: () => mockDate },
          updatedAt: { toDate: () => mockDate },
        }),
      });

      const result = await canGenerateTest(mockUid, 'enterprise');

      expect(result).toEqual({
        allowed: true,
        usage: expect.objectContaining({ testsGenerated: 1000 }),
        limit: Infinity,
        remaining: Infinity,
      });
    });
  });

  describe('incrementTestUsage', () => {
    it('throws error when increment fails', async () => {
      const mockError = new Error('Firebase error');
      (doc as jest.Mock).mockReturnValue('mock-usage-ref');
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({
          testsGenerated: 5,
          createdAt: { toDate: () => mockDate },
          updatedAt: { toDate: () => mockDate },
        }),
      });
      (updateDoc as jest.Mock).mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(incrementTestUsage(mockUid)).rejects.toThrow('Firebase error');
      expect(consoleSpy).toHaveBeenCalledWith('Error incrementing test usage:', mockError);
      
      consoleSpy.mockRestore();
    });
  });
});
