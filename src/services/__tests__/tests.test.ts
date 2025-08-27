import { 
  createTest, 
  updateTest, 
  moveTest, 
  getTest, 
  getAllTests, 
  getTestsInFolder,
  getUnorganizedTests,
  TestDoc 
} from '../tests';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  doc 
} from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  doc: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

describe('tests service', () => {
  const mockUid = 'test-user-123';
  const mockTestId = 'test-123';
  const mockFolderId = 'folder-123';
  const mockDate = new Date('2024-01-01T00:00:00Z');
  const mockDocRef = { id: mockTestId };

  const mockTestData = {
    testName: 'Test Quiz',
    fileName: 'test.pdf',
    fileType: 'pdf',
    extractedText: 'Sample text content',
    quizType: 'MCQ',
    questions: [{ id: 'q1', question: 'Test question?' }],
    answers: [{ id: 'q1', answer: 'Test answer' }],
    folderId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTest', () => {
    it('creates test successfully', async () => {
      (collection as jest.Mock).mockReturnValue('mock-collection');
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await createTest(mockUid, mockTestData);

      expect(collection).toHaveBeenCalledWith({}, `users/${mockUid}/tests`);
      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        ...mockTestData,
        userId: mockUid,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual({
        id: mockTestId,
        ...mockTestData,
        userId: mockUid,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('sets correct timestamps', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      (collection as jest.Mock).mockReturnValue('mock-collection');
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      await createTest(mockUid, mockTestData);

      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        ...mockTestData,
        userId: mockUid,
        createdAt: now,
        updatedAt: now,
      });

      jest.restoreAllMocks();
    });
  });

  describe('updateTest', () => {
    it('updates test successfully', async () => {
      const updateData = { testName: 'Updated Test Name' };
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await updateTest(mockUid, mockTestId, updateData);

      expect(doc).toHaveBeenCalledWith({}, `users/${mockUid}/tests/${mockTestId}`);
      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        ...updateData,
        updatedAt: expect.any(Date),
      });
    });

    it('always updates the updatedAt timestamp', async () => {
      const now = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await updateTest(mockUid, mockTestId, { testName: 'Updated' });

      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        testName: 'Updated',
        updatedAt: now,
      });

      jest.restoreAllMocks();
    });
  });

  describe('moveTest', () => {
    it('moves test to folder successfully', async () => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await moveTest(mockUid, mockTestId, mockFolderId);

      expect(doc).toHaveBeenCalledWith({}, `users/${mockUid}/tests/${mockTestId}`);
      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        folderId: mockFolderId,
        updatedAt: expect.any(Date),
      });
      expect(consoleSpy).toHaveBeenCalledWith(`Moving test ${mockTestId} to folder ${mockFolderId}`);
      expect(consoleSpy).toHaveBeenCalledWith(`Successfully moved test ${mockTestId} to folder ${mockFolderId}`);

      consoleSpy.mockRestore();
    });

    it('moves test to unorganized (null folder)', async () => {
      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      await moveTest(mockUid, mockTestId, null);

      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        folderId: null,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('getTest', () => {
    it('returns test when it exists', async () => {
      const mockTestDoc = {
        id: mockTestId,
        exists: () => true,
        data: () => ({
          ...mockTestData,
          userId: mockUid,
          createdAt: mockDate,
          updatedAt: mockDate,
        }),
      };

      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue(mockTestDoc);

      const result = await getTest(mockUid, mockTestId);

      expect(doc).toHaveBeenCalledWith({}, `users/${mockUid}/tests/${mockTestId}`);
      expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
      expect(result).toEqual({
        id: mockTestId,
        ...mockTestData,
        userId: mockUid,
        createdAt: mockDate,
        updatedAt: mockDate,
      });
    });

    it('returns null when test does not exist', async () => {
      const mockTestDoc = {
        exists: () => false,
        data: () => ({}),
      };

      (doc as jest.Mock).mockReturnValue('mock-doc-ref');
      (getDoc as jest.Mock).mockResolvedValue(mockTestDoc);

      const result = await getTest(mockUid, mockTestId);

      expect(result).toBeNull();
    });
  });

  describe('getAllTests', () => {
    it('returns all tests for user', async () => {
      const mockTests = [
        {
          id: 'test-1',
          testName: 'Test 1',
          userId: mockUid,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
        {
          id: 'test-2',
          testName: 'Test 2',
          userId: mockUid,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      const mockQuery1 = 'mock-query-1';
      const mockQuery2 = 'mock-query-2';
      const mockQuery3 = 'mock-query-3';
      const mockSnapshot = {
        docs: mockTests.map(test => ({
          id: test.id,
          data: () => test,
        })),
      };

      (collection as jest.Mock).mockReturnValue('mock-collection');
      (query as jest.Mock).mockReturnValue(mockQuery1);
      (orderBy as jest.Mock).mockReturnValue(mockQuery2);
      (limit as jest.Mock).mockReturnValue(mockQuery3);
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getAllTests(mockUid);

      expect(collection).toHaveBeenCalledWith({}, `users/${mockUid}/tests`);
      expect(collection).toHaveBeenCalledWith({}, `users/${mockUid}/tests`);
      expect(result).toEqual(mockTests);
    });
  });

  describe('getTestsInFolder', () => {
    it('returns tests in specific folder', async () => {
      const mockTests = [
        {
          id: 'test-1',
          testName: 'Test 1',
          folderId: mockFolderId,
          userId: mockUid,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
        {
          id: 'test-2',
          testName: 'Test 2',
          folderId: mockFolderId,
          userId: mockUid,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      const mockQuery1 = 'mock-query-1';
      const mockQuery2 = 'mock-query-2';
      const mockQuery3 = 'mock-query-3';
      const mockSnapshot = {
        docs: mockTests.map(test => ({
          id: test.id,
          data: () => test,
        })),
      };

      (collection as jest.Mock).mockReturnValue('mock-collection');
      (query as jest.Mock).mockReturnValue(mockQuery1);
      (where as jest.Mock).mockReturnValue(mockQuery2);
      (limit as jest.Mock).mockReturnValue(mockQuery3);
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await getTestsInFolder(mockUid, mockFolderId);

      expect(collection).toHaveBeenCalledWith({}, `users/${mockUid}/tests`);
      expect(consoleSpy).toHaveBeenCalledWith(`Querying tests collection for folderId: ${mockFolderId}`);
      expect(consoleSpy).toHaveBeenCalledWith(`Found ${mockTests.length} tests with folderId ${mockFolderId}`);
      expect(result).toEqual(mockTests);

      consoleSpy.mockRestore();
    });

    it('sorts tests by createdAt desc manually', async () => {
      const mockTests = [
        {
          id: 'test-1',
          testName: 'Test 1',
          folderId: mockFolderId,
          userId: mockUid,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: mockDate,
        },
        {
          id: 'test-2',
          testName: 'Test 2',
          folderId: mockFolderId,
          userId: mockUid,
          createdAt: new Date('2024-01-01T12:00:00Z'),
          updatedAt: mockDate,
        },
      ];

      const mockQuery1 = 'mock-query-1';
      const mockQuery2 = 'mock-query-2';
      const mockQuery3 = 'mock-query-3';
      const mockSnapshot = {
        docs: mockTests.map(test => ({
          id: test.id,
          data: () => test,
        })),
      };

      (collection as jest.Mock).mockReturnValue('mock-collection');
      (query as jest.Mock).mockReturnValue(mockQuery1);
      (where as jest.Mock).mockReturnValue(mockQuery2);
      (limit as jest.Mock).mockReturnValue(mockQuery3);
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getTestsInFolder(mockUid, mockFolderId);

      // Should be sorted by createdAt desc (newest first)
      expect(result[0].testName).toBe('Test 2');
      expect(result[1].testName).toBe('Test 1');
    });
  });

  describe('getUnorganizedTests', () => {
    it('returns tests with no folder', async () => {
      const mockTests = [
        {
          id: 'test-1',
          testName: 'Test 1',
          folderId: null,
          userId: mockUid,
          createdAt: mockDate,
          updatedAt: mockDate,
        },
      ];

      const mockQuery1 = 'mock-query-1';
      const mockQuery2 = 'mock-query-2';
      const mockQuery3 = 'mock-query-3';
      const mockQuery4 = 'mock-query-4';
      const mockSnapshot = {
        docs: mockTests.map(test => ({
          id: test.id,
          data: () => test,
        })),
      };

      (collection as jest.Mock).mockReturnValue('mock-collection');
      (query as jest.Mock).mockReturnValue(mockQuery1);
      (where as jest.Mock).mockReturnValue(mockQuery2);
      (orderBy as jest.Mock).mockReturnValue(mockQuery3);
      (limit as jest.Mock).mockReturnValue(mockQuery4);
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      const result = await getUnorganizedTests(mockUid);

      expect(collection).toHaveBeenCalledWith({}, `users/${mockUid}/tests`);
      expect(result).toEqual(mockTests);
    });
  });
});
