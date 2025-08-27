import { logResult, inferQuizTypeFrom, ResultData } from '../results';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date('2024-01-01T00:00:00Z')),
}));

jest.mock('@/lib/firebase', () => ({
  db: {},
}));

describe('results service', () => {
  const mockUid = 'test-user-123';
  const mockDate = new Date('2024-01-01T00:00:00Z');
  const mockDocRef = { id: 'mock-doc-id' };

  beforeEach(() => {
    jest.clearAllMocks();
    (serverTimestamp as jest.Mock).mockReturnValue(mockDate);
    (addDoc as jest.Mock).mockResolvedValue(mockDocRef);
  });

  describe('logResult', () => {
    const baseResultData: ResultData = {
      testName: 'Test Quiz',
      score: 85,
      timeTaken: 1200,
      quizType: 'MCQ',
      questionCount: 10,
    };

    it('logs result successfully with all required fields', async () => {
      (collection as jest.Mock).mockReturnValue('mock-collection');

      const result = await logResult(mockUid, baseResultData);

      expect(collection).toHaveBeenCalledWith({}, `users/${mockUid}/results`);
      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        testName: 'Test Quiz',
        score: 85,
        timeTaken: 1200,
        quizType: 'MCQ',
        questionCount: 10,
        topics: [],
        createdAt: mockDate,
      });
      expect(result).toBe('mock-doc-id');
    });

    it('includes optional fields when provided', async () => {
      (collection as jest.Mock).mockReturnValue('mock-collection');

      const resultDataWithOptional: ResultData = {
        ...baseResultData,
        folderId: 'folder-123',
        retakeOf: 'original-test-456',
        topics: ['security', 'networking'],
      };

      await logResult(mockUid, resultDataWithOptional);

      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        testName: 'Test Quiz',
        score: 85,
        timeTaken: 1200,
        quizType: 'MCQ',
        questionCount: 10,
        topics: ['security', 'networking'],
        createdAt: mockDate,
        folderId: 'folder-123',
        retakeOf: 'original-test-456',
      });
    });

    it('excludes undefined optional fields', async () => {
      (collection as jest.Mock).mockReturnValue('mock-collection');

      const resultDataWithUndefined: ResultData = {
        ...baseResultData,
        folderId: undefined,
        retakeOf: undefined,
        topics: undefined,
      };

      await logResult(mockUid, resultDataWithUndefined);

      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        testName: 'Test Quiz',
        score: 85,
        timeTaken: 1200,
        quizType: 'MCQ',
        questionCount: 10,
        topics: [],
        createdAt: mockDate,
      });
    });

    it('handles empty topics array', async () => {
      (collection as jest.Mock).mockReturnValue('mock-collection');

      const resultDataWithEmptyTopics: ResultData = {
        ...baseResultData,
        topics: [],
      };

      await logResult(mockUid, resultDataWithEmptyTopics);

      expect(addDoc).toHaveBeenCalledWith('mock-collection', {
        testName: 'Test Quiz',
        score: 85,
        timeTaken: 1200,
        quizType: 'MCQ',
        questionCount: 10,
        topics: [],
        createdAt: mockDate,
      });
    });

    it('throws error when logging fails', async () => {
      const mockError = new Error('Firebase error');
      (collection as jest.Mock).mockReturnValue('mock-collection');
      (addDoc as jest.Mock).mockRejectedValue(mockError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(logResult(mockUid, baseResultData)).rejects.toThrow('Firebase error');
      expect(consoleSpy).toHaveBeenCalledWith('Error logging result:', mockError);
      
      consoleSpy.mockRestore();
    });

    it('logs success message when result is logged', async () => {
      (collection as jest.Mock).mockReturnValue('mock-collection');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await logResult(mockUid, baseResultData);

      expect(consoleSpy).toHaveBeenCalledWith('Result logged successfully:', 'mock-doc-id');
      consoleSpy.mockRestore();
    });
  });

  describe('inferQuizTypeFrom', () => {
    it('returns "unknown" for empty questions array', () => {
      const result = inferQuizTypeFrom([]);
      expect(result).toBe('unknown');
    });

    it('returns "unknown" for null questions', () => {
      const result = inferQuizTypeFrom(null as any);
      expect(result).toBe('unknown');
    });

    it('returns "unknown" for undefined questions', () => {
      const result = inferQuizTypeFrom(undefined as any);
      expect(result).toBe('unknown');
    });

    it('returns "multiple_choice" for single MCQ type', () => {
      const questions = [
        { type: 'MCQ' },
        { type: 'MCQ' },
        { type: 'MCQ' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('multiple_choice');
    });

    it('returns "fill_blank" for single Fill-in-the-blank type', () => {
      const questions = [
        { type: 'Fill-in-the-blank' },
        { type: 'Fill-in-the-blank' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('fill_blank');
    });

    it('returns "true_false" for single True-False type', () => {
      const questions = [
        { type: 'True-False' },
        { type: 'True-False' },
        { type: 'True-False' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('true_false');
    });

    it('returns "essay" for single Essay type', () => {
      const questions = [
        { type: 'Essay' },
        { type: 'Essay' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('essay');
    });

    it('returns "mixed" for multiple question types', () => {
      const questions = [
        { type: 'MCQ' },
        { type: 'Fill-in-the-blank' },
        { type: 'Essay' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('mixed');
    });

    it('returns "mixed" for two different question types', () => {
      const questions = [
        { type: 'MCQ' },
        { type: 'True-False' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('mixed');
    });

    it('handles custom question types', () => {
      const questions = [
        { type: 'Custom Type' },
        { type: 'Custom Type' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('custom_type');
    });

    it('handles question types with special characters', () => {
      const questions = [
        { type: 'Question & Answer' },
        { type: 'Question & Answer' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('question___answer');
    });

    it('handles question types with numbers', () => {
      const questions = [
        { type: 'Type 123' },
        { type: 'Type 123' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('type_123');
    });

    it('handles single question', () => {
      const questions = [{ type: 'MCQ' }];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('multiple_choice');
    });

    it('handles questions with missing type property', () => {
      const questions = [
        { type: 'MCQ' },
        { otherProperty: 'value' },
        { type: 'MCQ' },
      ];
      
      const result = inferQuizTypeFrom(questions);
      expect(result).toBe('mixed');
    });
  });
});
