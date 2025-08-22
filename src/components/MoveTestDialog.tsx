'use client';

import { useState, useEffect } from 'react';
import { X, FolderIcon } from 'lucide-react';
import { TestDoc, Folder } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useFolders } from '@/hooks/useFolders';
import { moveTest } from '@/server/db/tests';

interface MoveTestDialogProps {
  open: boolean;
  onClose: () => void;
  test: TestDoc;
}

export function MoveTestDialog({ open, onClose, test }: MoveTestDialogProps) {
  const { user } = useAuth();
  const { folders } = useFolders();
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter out current folder and set initial selection
  const availableFolders = folders.filter(folder => folder.id !== test.folderId);
  
  useEffect(() => {
    if (availableFolders.length > 0 && !selectedFolderId) {
      setSelectedFolderId(availableFolders[0].id);
    }
  }, [availableFolders, selectedFolderId]);

  const handleMove = async () => {
    if (!user || !selectedFolderId) return;

    setLoading(true);
    setError('');

    try {
      await moveTest(user.uid, test.id, test.folderId, selectedFolderId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move test');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedFolderId('');
      setError('');
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Move Test</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Move <strong>{test.name}</strong> to a different folder:
            </p>
          </div>

          {/* Folder Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Destination Folder
            </label>
            {availableFolders.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No other folders available. Create a new folder first.
              </p>
            ) : (
              <div className="space-y-2">
                {availableFolders.map((folder) => (
                  <label
                    key={folder.id}
                    className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="folder"
                      value={folder.id}
                      checked={selectedFolderId === folder.id}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="mr-3 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex items-center">
                      <FolderIcon className={`h-5 w-5 mr-2 ${
                        folder.color ? `text-${folder.color}-500` : 'text-gray-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900">
                        {folder.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {folder.testCount} tests
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={loading || !selectedFolderId || availableFolders.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Moving...' : 'Move Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
