'use client';

import { useState, useEffect } from 'react';
import { Folder, TestHistory } from '@/types';
import { FirebaseService } from '@/services/firebaseService';
import { Plus, Folder as FolderIcon, Edit, Trash2, MoreHorizontal, X } from 'lucide-react';

interface FolderManagerProps {
  userId: string;
  onFolderSelect: (folder: Folder | null) => void;
  selectedFolder: Folder | null | undefined;
  onTestSelect: (test: TestHistory) => void;
}

export default function FolderManager({ 
  userId, 
  onFolderSelect, 
  selectedFolder, 
  onTestSelect 
}: FolderManagerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tests, setTests] = useState<TestHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, [userId]);

  useEffect(() => {
    if (selectedFolder) {
      loadTestsInFolder(selectedFolder.id);
    } else if (selectedFolder === null && folders.length > 0) {
      // Only load all tests if "All Tests" was explicitly selected (selectedFolder is null but we have folders)
      loadAllTests();
    }
    // If selectedFolder is undefined, don't load any tests (initial state)
  }, [selectedFolder, userId, folders.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const target = event.target as HTMLElement;
        // Check if the click is inside a dropdown or dropdown trigger
        const isDropdownClick = target.closest('[data-dropdown-trigger]') || 
                               target.closest('[data-dropdown-content]');
        
        if (!isDropdownClick) {
          console.log('Click outside detected, closing dropdown:', openDropdownId);
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Debug: Log folders state changes
  useEffect(() => {
    console.log('Folders state changed to:', folders);
    console.log('Number of folders:', folders.length);
  }, [folders]);

  const loadFolders = async () => {
    try {
      console.log('Loading folders for user:', userId);
      const userFolders = await FirebaseService.getUserFolders(userId);
      console.log('Loaded folders:', userFolders);
      console.log('Setting folders state with:', userFolders);
      setFolders(userFolders);
      
      // Verify state was set
      setTimeout(() => {
        console.log('Current folders state after setState:', folders);
      }, 100);
    } catch (error) {
      console.error('Failed to load folders:', error);
      console.error('Error details:', error);
    }
  };

  const loadAllTests = async () => {
    try {
      const allTests = await FirebaseService.getUserTestHistory(userId);
      setTests(allTests);
    } catch (error) {
      console.error('Failed to load tests:', error);
    }
  };

  const loadTestsInFolder = async (folderId: string) => {
    try {
      const folderTests = await FirebaseService.getTestsInFolder(userId, folderId);
      setTests(folderTests);
    } catch (error) {
      console.error('Failed to load tests in folder:', error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setLoading(true);
    try {
      const newFolder = await FirebaseService.createFolder(
        userId,
        newFolderName.trim(),
        newFolderDescription.trim(),
        newFolderColor
      );
      
      console.log('Created new folder:', newFolder);
      console.log('Previous folders:', folders);
      setFolders([newFolder, ...folders]);
      console.log('Updated folders state');
      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderColor('#3B82F6');
      setShowCreateForm(false);
    } catch (error: any) {
      console.error('Failed to create folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !newFolderName.trim()) return;

    setLoading(true);
    try {
      await FirebaseService.updateFolder(editingFolder.id, {
        name: newFolderName.trim(),
        description: newFolderDescription.trim(),
        color: newFolderColor,
      });
      
      setFolders(folders.map(f => 
        f.id === editingFolder.id 
          ? { ...f, name: newFolderName.trim(), description: newFolderDescription.trim(), color: newFolderColor }
          : f
      ));
      
      setEditingFolder(null);
      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderColor('#3B82F6');
      setShowEditForm(false);
    } catch (error: any) {
      console.error('Failed to update folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Tests will not be deleted, only moved to "Unorganized".')) {
      return;
    }

    try {
      console.log('Deleting folder:', folderId);
      
      // First, move all tests in this folder to unorganized
      const testsInFolder = tests.filter(test => test.folderId === folderId);
      console.log('Moving', testsInFolder.length, 'tests to unorganized');
      
      for (const test of testsInFolder) {
        await FirebaseService.moveTestToFolder(test.id, null);
      }
      
      // Then delete the folder
      await FirebaseService.deleteFolder(folderId);
      console.log('Folder deleted successfully');
      
      // Update local state
      setFolders(folders.filter(f => f.id !== folderId));
      setTests(tests.map(test => 
        test.folderId === folderId ? { ...test, folderId: undefined } : test
      ));
      
      if (selectedFolder?.id === folderId) {
        onFolderSelect(null);
      }
      
      console.log('Local state updated after folder deletion');
    } catch (error: any) {
      console.error('Failed to delete folder:', error);
      alert('Failed to delete folder. Please try again.');
    }
  };

  const handleMoveTestToFolder = async (testId: string, folderId: string | null) => {
    try {
      console.log('Moving test', testId, 'to folder', folderId);
      await FirebaseService.moveTestToFolder(testId, folderId);
      console.log('Test moved successfully');
      
      // Update local state
      setTests(tests.map(test => 
        test.id === testId ? { ...test, folderId: folderId || undefined } : test
      ));
      console.log('Local state updated for test move');
    } catch (error: any) {
      console.error('Failed to move test:', error);
      alert('Failed to move test. Please try again.');
    }
  };

  const startEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setNewFolderDescription(folder.description || '');
    setNewFolderColor(folder.color || '#3B82F6');
    setShowEditForm(true);
  };

  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Organize Your Tests</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Folder</span>
        </button>
      </div>

      {/* Folder List */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <button
            onClick={() => onFolderSelect(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selectedFolder 
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Tests
          </button>
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center space-x-2">
              <button
                onClick={() => onFolderSelect(folder)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                  selectedFolder?.id === folder.id 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: folder.color }}
                />
                <span>{folder.name}</span>
              </button>
              
              {/* Folder actions dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === `folder-${folder.id}` ? null : `folder-${folder.id}`);
                  }}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
                  data-dropdown-trigger
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
                
                {openDropdownId === `folder-${folder.id}` && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[150px] z-10" data-dropdown-content>
                    <button
                      onClick={() => {
                        startEditFolder(folder);
                        setOpenDropdownId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                    >
                      Edit Folder
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteFolder(folder.id);
                        setOpenDropdownId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                    >
                      Delete Folder
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Test Button - shown when a folder is selected */}
      {selectedFolder && (
        <div className="mb-4">
          <button
            onClick={() => {
              // Navigate to upload page with folder pre-selected
              window.location.href = '/?folder=' + selectedFolder.id;
            }}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Test in {selectedFolder.name}</span>
          </button>
        </div>
      )}

      {/* Test List */}
      <div className="space-y-3">
        {tests.map((test) => (
          <div
            key={test.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {test.testName}
              </h4>
              <p className="text-xs text-gray-500">
                {test.fileName} • {test.quizType} • {test.score !== undefined ? `${test.score}%` : 'Not completed'}
                {!selectedFolder && test.folderId && (
                  <span className="ml-2">
                    • <span className="inline-flex items-center">
                      <div 
                        className="w-2 h-2 rounded-full mr-1" 
                        style={{ backgroundColor: folders.find(f => f.id === test.folderId)?.color || '#3B82F6' }}
                      />
                      {folders.find(f => f.id === test.folderId)?.name || 'Unknown Folder'}
                    </span>
                  </span>
                )}
                {!selectedFolder && !test.folderId && (
                  <span className="ml-2 text-gray-400">• Unorganized</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onTestSelect(test)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
              >
                View
              </button>
              
              <div className="relative">
                <button 
                  className="p-1 hover:bg-gray-200 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Test dropdown clicked, current openDropdownId:', openDropdownId, 'test.id:', test.id);
                    setOpenDropdownId(openDropdownId === test.id ? null : test.id);
                  }}
                  data-dropdown-trigger
                >
                  <MoreHorizontal className="h-4 w-4 text-gray-500" />
                </button>
                
                {/* Move to folder dropdown */}
                {openDropdownId === test.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-10" data-dropdown-content>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                      Move to folder
                    </div>
                    <button
                      onClick={() => {
                        handleMoveTestToFolder(test.id, null);
                        setOpenDropdownId(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        !test.folderId ? 'text-indigo-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      Unorganized
                    </button>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          handleMoveTestToFolder(test.id, folder.id);
                          setOpenDropdownId(null);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center space-x-2 ${
                          test.folderId === folder.id ? 'text-indigo-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: folder.color }}
                        />
                        <span>{folder.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {tests.length === 0 && selectedFolder !== undefined && (
          <div className="text-center py-8 text-gray-500">
            {selectedFolder ? 'No tests in this folder yet.' : 'No tests created yet.'}
          </div>
        )}
        
        {selectedFolder === undefined && (
          <div className="text-center py-12 text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a View</h3>
            <p className="text-sm">Choose &quot;All Tests&quot; to see all your tests, or select a specific folder to view tests in that folder.</p>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Folder</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  placeholder="Enter folder name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  placeholder="Enter folder description"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex space-x-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newFolderColor === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {showEditForm && editingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Folder</h3>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  placeholder="Enter folder name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  placeholder="Enter folder description"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex space-x-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newFolderColor === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
