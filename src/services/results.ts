import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ResultData {
  testName: string;
  folderId?: string;
  score: number;
  timeTaken: number;
  quizType: string;
  questionCount: number;
  retakeOf?: string;
  topics?: string[];
}

export async function logResult(uid: string, data: ResultData) {
  try {
    const ref = collection(db, `users/${uid}/results`);
    const docRef = await addDoc(ref, { 
      ...data, 
      createdAt: serverTimestamp() 
    });
    
    console.log('Result logged successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error logging result:', error);
    throw error;
  }
}

// Helper function to infer quiz type from questions
export function inferQuizTypeFrom(questions: any[]): string {
  if (!questions || questions.length === 0) return 'unknown';
  
  const types = questions.map(q => q.type);
  const uniqueTypes = [...new Set(types)];
  
  if (uniqueTypes.length === 1) {
    const type = uniqueTypes[0];
    switch (type) {
      case 'MCQ': return 'multiple_choice';
      case 'Fill-in-the-blank': return 'fill_blank';
      case 'True-False': return 'true_false';
      case 'Essay': return 'essay';
      default: return type.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
  }
  
  return 'mixed';
}
