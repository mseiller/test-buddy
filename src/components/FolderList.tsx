'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, FolderIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { NewFolderDialog } from './NewFolderDialog';
import { useFolders } from '@/hooks/useFolders';
import { Folder } from '@/types';

export function FolderList() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { folders, loading, error } = useFolders();
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  const handleFolderClick = (folderId: string) => {
    router.push(`/folder/${folderId}`);
  };

  const handleNewFolder = () => {
    setShowNewFolderDialog(true);
  };

  const getFolderIcon = (folder: Folder) => {
    const colors = {
      blue: 'text-blue-500',
      green: 'text-green-500',
      purple: 'text-purple-500',
      red: 'text-red-500',
      yellow: 'text-yellow-500',
      indigo: 'text-indigo-500',
      pink: 'text-pink-500',
      gray: 'text-gray-500',
    };
    
    const colorClass = folder.color ? colors[folder.color as keyof typeof colors] || 'text-gray-500' : 'text-gray-500';
    
    return <FolderIcon className={`h-5 w-5 ${colorClass}`} />;
  };

  if (!user) {
    return (
      <div className="p-4">
        <p className="text-gray-500 text-sm">Please sign in to view folders</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Test Buddy</h1>
        <p className="text-sm text-gray-500">Organize your tests</p>
      </div>

      {/* New Folder Button */}
      <div className="p-4">
        <button
          onClick={handleNewFolder}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Folder
        </button>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-4">
            <p className="text-red-500 text-sm">Error loading folders</p>
          </div>
        ) : folders.length === 0 ? (
          <div className="p-4 text-center">
            <FolderIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No folders yet</p>
            <p className="text-gray-400 text-xs">Create your first folder to get started</p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {folders.map((folder) => {
              const isActive = pathname === `/folder/${folder.id}`;
              return (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {getFolderIcon(folder)}
                  <span className="ml-3 flex-1 text-left truncate">{folder.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {folder.testCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <NewFolderDialog
        open={showNewFolderDialog}
        onClose={() => setShowNewFolderDialog(false)}
      />
    </div>
  );
}
