'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Folder, TestDoc } from '@/types';
import { getFolder } from '@/server/db/folders';
import { listTests } from '@/server/db/tests';
import FileUpload from '@/components/FileUpload';
import { TestCard } from '@/components/TestCard';
import { Search, Filter, Upload as UploadIcon } from 'lucide-react';

export default function FolderPage() {
  const { folderId } = useParams();
  const { user } = useAuth();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!user || !folderId) return;

    const loadFolderData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load folder
        const folderData = await getFolder(user.uid, folderId as string);
        if (!folderData) {
          setError('Folder not found');
          return;
        }
        setFolder(folderData);

        // Load tests
        const testsData = await listTests(user.uid, folderId as string);
        setTests(testsData);
      } catch (err) {
        console.error('Error loading folder data:', err);
        setError('Failed to load folder data');
      } finally {
        setLoading(false);
      }
    };

    loadFolderData();
  }, [user, folderId]);

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => test.tags?.includes(tag));
    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(
    new Set(tests.flatMap(test => test.tags || []))
  ).sort();

  const handleFileProcessed = (fileUpload: any) => {
    // TODO: Create test document and add to folder
    console.log('File processed:', fileUpload);
    setShowUpload(false);
  };

  const handleFileError = (error: string) => {
    console.error('File error:', error);
    // TODO: Show error toast
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Please sign in to view this folder</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">{error || 'Folder not found'}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{folder.name}</h1>
            <p className="text-gray-600">
              {tests.length} test{tests.length !== 1 ? 's' : ''} • Created {new Date(folder.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload Test
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Tags Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(prev => 
                      prev.includes(tag) 
                        ? prev.filter(t => t !== tag)
                        : [...prev, tag]
                    );
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <div className="text-center py-12">
          <UploadIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {tests.length === 0 ? 'No tests in this folder yet' : 'No tests match your search'}
          </h3>
          <p className="text-gray-500 mb-6">
            {tests.length === 0 
              ? 'Drag & drop a PDF or click Upload to get started'
              : 'Try adjusting your search terms or filters'
            }
          </p>
          {tests.length === 0 && (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              Upload Your First Test
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Test to {folder.name}
              </h2>
              <FileUpload
                onFileProcessed={handleFileProcessed}
                onError={handleFileError}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
