'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFolders } from '@/hooks/useFolders';
import { FolderList } from '@/components/FolderList';
import FileUpload from '@/components/FileUpload';
import { FolderIcon, ArrowLeft } from 'lucide-react';

export default function UploadPage() {
  const { user } = useAuth();
  const { folders } = useFolders();
  const router = useRouter();
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [showFolderSelect, setShowFolderSelect] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!user) {
    router.push('/');
    return null;
  }

  const handleFileProcessed = (fileUpload: any) => {
    if (isUploading) {
      console.log('Upload already in progress, ignoring duplicate call');
      return;
    }
    
    console.log('File processed:', fileUpload);
    console.log('Selected folder ID:', selectedFolderId);
    
    setIsUploading(true);
    
    // Store the file upload data and redirect to quiz generation
    if (selectedFolderId) {
      console.log('Storing file data and redirecting to quiz...');
      // Store in localStorage for now (we'll implement proper state management later)
      localStorage.setItem('tempFileUpload', JSON.stringify({
        ...fileUpload,
        folderId: selectedFolderId === 'general' ? null : selectedFolderId
      }));
      
      // Force the redirect
      setTimeout(() => {
        router.push('/quiz');
      }, 100);
    } else {
      console.error('No folder selected!');
      setIsUploading(false);
      // Show error to user
      alert('Please select a folder first before uploading.');
    }
  };

  const handleFileError = (error: string) => {
    console.error('File error:', error);
    // TODO: Show error toast
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setShowFolderSelect(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <FolderList />
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={() => router.push('/')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Upload New Test</h1>
            </div>
            <p className="text-gray-600">
              Choose a folder and upload your document to generate a quiz
            </p>
          </div>

          {/* Debug Info */}
          <div className="mb-4 p-3 bg-gray-100 rounded-md text-sm">
            <div>Debug: {folders.length} folders available</div>
            <div>Selected folder: {selectedFolderId || 'none'}</div>
            <div>User: {user?.email}</div>
          </div>

          {/* Folder Selection */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Destination Folder</h2>
            {folders.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No folders created yet</p>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Create Your First Folder
                  </button>
                  <div className="text-sm text-gray-500">
                    Or upload without a folder (will be saved to general history)
                  </div>
                  <button
                    onClick={() => setSelectedFolderId('general')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Upload Without Folder
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => handleFolderSelect(folder.id)}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedFolderId === folder.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <FolderIcon className={`h-5 w-5 mr-2 ${
                        folder.color ? `text-${folder.color}-500` : 'text-gray-500'
                      }`} />
                      <h3 className="font-medium text-gray-900">{folder.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500">
                      {folder.testCount} test{folder.testCount !== 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File Upload */}
          {selectedFolderId && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload to: {folders.find(f => f.id === selectedFolderId)?.name}
              </h3>
              {isUploading && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-blue-700">Processing upload...</span>
                  </div>
                </div>
              )}
              <FileUpload
                key={`upload-${selectedFolderId}`}
                onFileProcessed={handleFileProcessed}
                onError={handleFileError}
              />
            </div>
          )}

          {!selectedFolderId && folders.length > 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Please select a folder above to upload your test</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
