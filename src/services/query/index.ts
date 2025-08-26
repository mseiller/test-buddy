/**
 * Query Services Index
 * Central export point for all query optimization utilities
 */

export { QueryOptimizer } from './QueryOptimizer';
export { BatchOperations } from './BatchOperations';
export { IndexAnalyzer, FIRESTORE_INDEXES, FIRESTORE_INDEXES_CONFIG } from './FirestoreIndexes';

export type { 
  QueryCache, 
  OptimizedQueryOptions, 
  QueryResult, 
  QueryStats 
} from './QueryOptimizer';

export type { 
  BatchOperation, 
  BatchResult, 
  TransactionOperation 
} from './BatchOperations';

export type { 
  FirestoreIndex 
} from './FirestoreIndexes';
