/**
 * Test Buddy - AI-Powered Quiz Generator
 * 
 * This is the main entry point for the Test Buddy application.
 * It exports all public APIs and services for external use.
 * 
 * @packageDocumentation
 */

// Core Services
export { OpenRouterService } from './services/openRouter';
export { default as FirebaseService } from './services/firebaseService';
export { default as SecurityManager } from './services/security';
export { default as ErrorManagementService } from './services/errors';

// Types
export type {
  Question,
  UserAnswer,
  QuizType,
  TestHistory,
  FeedbackSummary,
  QuizGenerationRequest,
  User,
  UserPlan,
  PlanFeatures,
} from './types';

// Components (for documentation purposes)
export { default as AuthForm } from './components/AuthForm';
export { default as FileUpload } from './components/FileUpload';
export { default as QuizDisplay } from './components/QuizDisplay';
export { default as QuizResults } from './components/QuizResults';
export { default as FolderManager } from './components/FolderManager';

// Contexts
export { UserPlanProvider, useUserPlan } from './contexts/UserPlanContext';

// Hooks
export { usePaywall } from './hooks/usePaywall';

/**
 * Application Configuration
 */
export const APP_CONFIG = {
  /** Application name */
  name: 'Test Buddy',
  /** Application version */
  version: '0.1.0',
  /** Supported file types for upload */
  supportedFileTypes: ['.txt', '.pdf', '.doc', '.docx', '.csv', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'],
  /** Maximum file size in bytes (10MB) */
  maxFileSize: 10 * 1024 * 1024,
  /** Default quiz configuration */
  defaultQuizConfig: {
    questionCount: 10,
    quizType: 'MCQ' as const,
  },
  /** API endpoints */
  apiEndpoints: {
    extractPdf: '/api/extract-pdf',
    extractImage: '/api/extract-image',
    monitoring: {
      dashboard: '/api/monitoring/dashboard',
      health: '/api/monitoring/health',
      optimization: {
        analyze: '/api/monitoring/optimization/analyze',
        apply: '/api/monitoring/optimization/apply',
      },
    },
  },
} as const;

/**
 * Initialize the application
 * 
 * This function should be called once when the application starts
 * to initialize all required services and configurations.
 * 
 * @example
 * ```typescript
 * import { initializeApp } from './index';
 * 
 * // Initialize the application
 * await initializeApp();
 * ```
 */
export async function initializeApp(): Promise<void> {
  try {
    // Initialize security services
    await SecurityManager.getInstance().initialize();
    
    // Initialize error management
    await ErrorManagementService.getInstance().initialize();
    
    console.log('Test Buddy application initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Test Buddy application:', error);
    throw error;
  }
}

/**
 * Cleanup application resources
 * 
 * This function should be called when the application is shutting down
 * to properly cleanup resources and connections.
 * 
 * @example
 * ```typescript
 * import { cleanupApp } from './index';
 * 
 * // Cleanup when shutting down
 * await cleanupApp();
 * ```
 */
export async function cleanupApp(): Promise<void> {
  try {
    // Cleanup security services
    await SecurityManager.getInstance().cleanup();
    
    // Cleanup error management
    await ErrorManagementService.getInstance().cleanup();
    
    console.log('Test Buddy application cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup Test Buddy application:', error);
    throw error;
  }
}
