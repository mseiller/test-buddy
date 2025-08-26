/**
 * Firestore Index Definitions
 * Defines optimal indexes for all Firestore queries used in the application
 */

export interface FirestoreIndex {
  collectionGroup?: string;
  collection?: string;
  fields: Array<{
    fieldPath: string;
    order?: 'ASCENDING' | 'DESCENDING';
    arrayConfig?: 'CONTAINS';
  }>;
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
  description: string;
  estimatedCost: 'LOW' | 'MEDIUM' | 'HIGH';
  usage: string[];
}

/**
 * All Firestore indexes required for optimal query performance
 */
export const FIRESTORE_INDEXES: FirestoreIndex[] = [
  // User Test History Indexes
  {
    collection: 'users/{userId}/tests',
    fields: [
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Basic test history ordering by creation date',
    estimatedCost: 'LOW',
    usage: ['getUserTestHistory', 'loadAllTests']
  },
  {
    collection: 'users/{userId}/tests',
    fields: [
      { fieldPath: 'folderId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Tests filtered by folder and ordered by date',
    estimatedCost: 'MEDIUM',
    usage: ['getTestsInFolder', 'loadTestsInFolder']
  },
  {
    collection: 'users/{userId}/tests',
    fields: [
      { fieldPath: 'completedAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Tests ordered by completion date',
    estimatedCost: 'LOW',
    usage: ['getCompletedTests', 'getUserMetrics']
  },
  {
    collection: 'users/{userId}/tests',
    fields: [
      { fieldPath: 'score', order: 'DESCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Tests ordered by score and date for leaderboards',
    estimatedCost: 'MEDIUM',
    usage: ['getTopScores', 'getUserMetrics']
  },

  // User Results Indexes
  {
    collection: 'users/{userId}/results',
    fields: [
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Results ordered by creation date',
    estimatedCost: 'LOW',
    usage: ['getUserMetrics', 'getRecentResults']
  },
  {
    collection: 'users/{userId}/results',
    fields: [
      { fieldPath: 'folderId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Results filtered by folder and ordered by date',
    estimatedCost: 'MEDIUM',
    usage: ['getFolderResults', 'getUserMetrics']
  },
  {
    collection: 'users/{userId}/results',
    fields: [
      { fieldPath: 'quizType', order: 'ASCENDING' },
      { fieldPath: 'score', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Results filtered by quiz type and ordered by score',
    estimatedCost: 'MEDIUM',
    usage: ['getResultsByType', 'analytics']
  },

  // Folders Indexes
  {
    collection: 'folders',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'name', order: 'ASCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'User folders ordered by name',
    estimatedCost: 'LOW',
    usage: ['getUserFolders', 'loadFolders']
  },
  {
    collection: 'folders',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'User folders ordered by creation date',
    estimatedCost: 'LOW',
    usage: ['getRecentFolders']
  },

  // Legacy Test History Indexes (for migration)
  {
    collection: 'testHistory',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Legacy test history by user and date',
    estimatedCost: 'MEDIUM',
    usage: ['migrateFromTestHistory', 'getUserTestHistory']
  },
  {
    collection: 'testHistory',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'folderId', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Legacy test history by user, folder, and date',
    estimatedCost: 'HIGH',
    usage: ['migrateFromTestHistory', 'getTestsInFolder']
  },
  {
    collection: 'testHistory',
    fields: [
      { fieldPath: 'userId', order: 'ASCENDING' },
      { fieldPath: 'completedAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Legacy completed tests by user and completion date',
    estimatedCost: 'MEDIUM',
    usage: ['getCompletedTests', 'getUserMetrics']
  },

  // User Usage Tracking Indexes
  {
    collection: 'users/{userId}/usage',
    fields: [
      { fieldPath: 'month', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Usage data ordered by month',
    estimatedCost: 'LOW',
    usage: ['getUsageData', 'checkQuotaLimits']
  },

  // Analytics and Metrics Indexes
  {
    collection: 'users/{userId}/results',
    fields: [
      { fieldPath: 'createdAt', order: 'ASCENDING' },
      { fieldPath: 'score', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Results for time-series analytics with score ordering',
    estimatedCost: 'MEDIUM',
    usage: ['getAnalytics', 'generateReports']
  },
  {
    collection: 'users/{userId}/tests',
    fields: [
      { fieldPath: 'quizType', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION',
    description: 'Tests filtered by type and ordered by date',
    estimatedCost: 'MEDIUM',
    usage: ['getTestsByType', 'analytics']
  },

  // Collection Group Indexes (for cross-user queries - admin features)
  {
    collectionGroup: 'tests',
    fields: [
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION_GROUP',
    description: 'All tests across users ordered by date (admin)',
    estimatedCost: 'HIGH',
    usage: ['adminDashboard', 'systemMetrics']
  },
  {
    collectionGroup: 'results',
    fields: [
      { fieldPath: 'score', order: 'DESCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ],
    queryScope: 'COLLECTION_GROUP',
    description: 'Global leaderboard across all users',
    estimatedCost: 'HIGH',
    usage: ['globalLeaderboard', 'systemAnalytics']
  }
];

/**
 * Generate Firestore CLI commands to create indexes
 */
export function generateIndexCommands(): string[] {
  const commands: string[] = [];

  FIRESTORE_INDEXES.forEach((index, i) => {
    const fieldsStr = index.fields
      .map(field => {
        let fieldStr = field.fieldPath;
        if (field.order) {
          fieldStr += ` ${field.order}`;
        }
        if (field.arrayConfig) {
          fieldStr += ` ${field.arrayConfig}`;
        }
        return fieldStr;
      })
      .join(',');

    const collectionPath = index.collectionGroup || index.collection || '';
    const scopeFlag = index.queryScope === 'COLLECTION_GROUP' ? '--collection-group' : '';

    commands.push(
      `# ${index.description}`,
      `# Usage: ${index.usage.join(', ')}`,
      `# Cost: ${index.estimatedCost}`,
      `firebase firestore:indexes:create ${scopeFlag} --fields="${fieldsStr}" "${collectionPath}"`,
      ''
    );
  });

  return commands;
}

/**
 * Generate firestore.indexes.json configuration
 */
export function generateIndexesJson(): any {
  const indexes = FIRESTORE_INDEXES.map(index => ({
    collectionGroup: index.collectionGroup,
    collectionId: index.collection,
    queryScope: index.queryScope,
    fields: index.fields.map(field => ({
      fieldPath: field.fieldPath,
      order: field.order || 'ASCENDING',
      ...(field.arrayConfig && { arrayConfig: field.arrayConfig })
    }))
  }));

  return {
    indexes,
    fieldOverrides: [
      // Disable automatic indexing for large text fields
      {
        collectionGroup: 'tests',
        fieldPath: 'extractedText',
        indexes: []
      },
      {
        collectionGroup: 'testHistory',
        fieldPath: 'extractedText',
        indexes: []
      },
      // Optimize question and answer arrays
      {
        collectionGroup: 'tests',
        fieldPath: 'questions',
        indexes: []
      },
      {
        collectionGroup: 'tests',
        fieldPath: 'answers',
        indexes: []
      }
    ]
  };
}

/**
 * Analyze query performance and suggest optimizations
 */
export class IndexAnalyzer {
  /**
   * Check if a query has proper indexing
   */
  static analyzeQuery(
    collection: string,
    filters: Array<{ field: string; operator: string }>,
    orderBy?: { field: string; direction: string }
  ): {
    hasOptimalIndex: boolean;
    suggestedIndex?: FirestoreIndex;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Check for existing index
    const matchingIndex = FIRESTORE_INDEXES.find(index => {
      if (index.collection !== collection && index.collectionGroup !== collection) {
        return false;
      }

      // Check if all filters and orderBy are covered
      const indexFields = index.fields.map(f => f.fieldPath);
      const queryFields = [
        ...filters.map(f => f.field),
        ...(orderBy ? [orderBy.field] : [])
      ];

      return queryFields.every(field => indexFields.includes(field));
    });

    if (matchingIndex) {
      return {
        hasOptimalIndex: true,
        recommendations: [`Query is optimally indexed: ${matchingIndex.description}`]
      };
    }

    // Generate suggested index
    const fields = [
      ...filters.map(f => ({ fieldPath: f.field, order: 'ASCENDING' as const })),
      ...(orderBy ? [{ 
        fieldPath: orderBy.field, 
        order: (orderBy.direction.toUpperCase() as 'ASCENDING' | 'DESCENDING')
      }] : [])
    ];

    const suggestedIndex: FirestoreIndex = {
      collection,
      fields,
      queryScope: 'COLLECTION',
      description: `Auto-generated index for query on ${collection}`,
      estimatedCost: fields.length > 2 ? 'HIGH' : 'MEDIUM',
      usage: ['Custom query']
    };

    recommendations.push(
      'Query lacks optimal indexing',
      'Consider creating the suggested index',
      `Estimated query cost: ${suggestedIndex.estimatedCost}`,
      ...(fields.length > 3 ? ['Warning: Complex index may be expensive'] : [])
    );

    return {
      hasOptimalIndex: false,
      suggestedIndex,
      recommendations
    };
  }

  /**
   * Generate index creation script
   */
  static generateIndexScript(): string {
    const commands = generateIndexCommands();
    
    return `#!/bin/bash
# Firestore Index Creation Script
# Generated on ${new Date().toISOString()}

echo "Creating Firestore indexes for Test Buddy..."

${commands.join('\n')}

echo "Index creation commands generated. Run these commands using Firebase CLI."
echo "Note: Index creation can take several minutes to complete."
`;
  }

  /**
   * Get index recommendations for existing queries
   */
  static getRecommendations(): Array<{
    query: string;
    recommendation: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }> {
    return [
      {
        query: 'getUserTestHistory with folder filter',
        recommendation: 'Create composite index on (folderId, createdAt)',
        priority: 'HIGH'
      },
      {
        query: 'getUserMetrics with time range',
        recommendation: 'Create index on (createdAt) for efficient range queries',
        priority: 'MEDIUM'
      },
      {
        query: 'Global analytics queries',
        recommendation: 'Consider collection group indexes for cross-user analytics',
        priority: 'LOW'
      },
      {
        query: 'Large text field queries',
        recommendation: 'Disable automatic indexing for extractedText fields',
        priority: 'HIGH'
      }
    ];
  }
}

/**
 * Export index configuration for Firebase CLI
 */
export const FIRESTORE_INDEXES_CONFIG = generateIndexesJson();
