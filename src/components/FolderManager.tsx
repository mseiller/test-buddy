'use client';

import React, { useState, useEffect } from 'react';
import { Folder, TestHistory } from '@/types';
import { FirebaseService } from '@/services/firebaseService';
import { getAllTests, getTestsInFolder, moveTest, migrateFromTestHistory } from '@/services/tests';

// Import the new modular components
import FolderList from './features/folder-manager/FolderList';
import TestList from './features/folder-manager/TestList';
import CreateFolderModal from './features/folder-manager/CreateFolderModal';
import EditFolderModal from './features/folder-manager/EditFolderModal';

interface FolderManagerProps {
  userId: string;
  selectedFolder?: Folder | null;
  onFolderSelect: (folder: Folder | null) => void;
  onTestSelect: (test: TestHistory) => void;
}

export default function FolderManager({ 
  userId, 
  selectedFolder, 
  onFolderSelect, 
  onTestSelect 
}: FolderManagerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tests, setTests] = useState<TestHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, [userId]);

  // Load tests when folder selection changes
  useEffect(() => {
    if (selectedFolder) {
      loadTestsInFolder(selectedFolder.id);
    } else if (selectedFolder === null && folders.length > 0) {
      // Only load all tests if "All Tests" was explicitly selected
      loadAllTests();
    }
    // If selectedFolder is undefined, don't load any tests (initial state)
  }, [selectedFolder, userId, folders.length]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      console.log('Loading folders for user:', userId);
      
      // Migrate data from old testHistory collection
      await migrateFromTestHistory(userId);
      
      const userFolders = await FirebaseService.getUserFolders(userId);
      console.log('Loaded folders:', userFolders);
      setFolders(userFolders);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to load folders:', message);
      console.error('Auto-migration failed during folder load:', message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTests = async () => {
    try {
      setLoading(true);
      console.log('Loading all tests for user:', userId);
      
      // Migrate data from old testHistory collection
      await migrateFromTestHistory(userId);
      
      const allTests = await getAllTests(userId);
      console.log('Loaded all tests:', allTests.length);
      
      // Convert TestDoc[] to TestHistory[]
      const convertedTests: TestHistory[] = allTests
        .filter(test => test.id) // Filter out tests without IDs
        .map(test => ({
          id: test.id!,
          userId: test.userId,
          testName: test.testName,
          fileName: test.fileName,
          fileType: test.fileType,
          extractedText: test.extractedText,
          quizType: test.quizType as any,
          questions: test.questions as any,
          answers: test.answers as any,
          score: test.score || 0,
          createdAt: test.createdAt,
          completedAt: test.completedAt || new Date(),
          folderId: test.folderId || ''
        }));
      
      setTests(convertedTests);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to load all tests:', message);
      console.error('Auto-migration failed during test load:', message);
    } finally {
      setLoading(false);
    }
  };

  const loadTestsInFolder = async (folderId: string) => {
    try {
      setLoading(true);
      console.log('Loading tests in folder:', folderId);
      const folderTests = await getTestsInFolder(userId, folderId);
      console.log('Loaded folder tests:', folderTests.length);
      
      // Convert TestDoc[] to TestHistory[]
      const convertedTests: TestHistory[] = folderTests
        .filter(test => test.id) // Filter out tests without IDs
        .map(test => ({
          id: test.id!,
          userId: test.userId,
          testName: test.testName,
          fileName: test.fileName,
          fileType: test.fileType,
          extractedText: test.extractedText,
          quizType: test.quizType as any,
          questions: test.questions as any,
          answers: test.answers as any,
          score: test.score || 0,
          createdAt: test.createdAt,
          completedAt: test.completedAt || new Date(),
          folderId: test.folderId || ''
        }));
      
      setTests(convertedTests);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to load tests in folder:', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (name: string, description: string, color: string) => {
    try {
      setLoading(true);
      console.log('Creating folder:', { name, description, color });
      
      const newFolder = await FirebaseService.createFolder(userId, name, description, color);
      
      console.log('Folder created successfully:', newFolder);
      setFolders(prev => [...prev, newFolder]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to create folder:', message);
      throw err; // Re-throw to let modal handle error display
    } finally {
      setLoading(false);
    }
  };

  const handleEditFolder = async (folderId: string, name: string, description: string, color: string) => {
    try {
      setLoading(true);
      console.log('Updating folder:', { folderId, name, description, color });
      
      await FirebaseService.updateFolder(folderId, { name, description, color });
      
      console.log('Folder updated successfully');
      setFolders(prev => prev.map(folder => 
        folder.id === folderId 
          ? { ...folder, name, description, color }
          : folder
      ));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to update folder:', message);
      throw err; // Re-throw to let modal handle error display
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      setLoading(true);
      console.log('Deleting folder:', folderId);
      
      await FirebaseService.deleteFolder(folderId);
      
      console.log('Folder deleted successfully');
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      
      // If we were viewing the deleted folder, switch to "All Tests"
      if (selectedFolder?.id === folderId) {
        onFolderSelect(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to delete folder:', message);
      alert('Failed to delete folder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveTest = async (testId: string, folderId: string | null) => {
    try {
      console.log('Moving test:', { testId, folderId });
      
      await moveTest(userId, testId, folderId);
      
      console.log('Test moved successfully');
      
      // Update local state
      setTests(prev => prev.map(test =>
        test.id === testId ? { ...test, folderId: folderId || '' } : test
      ));
      
      // Reload the current view to reflect changes
      if (selectedFolder) {
        loadTestsInFolder(selectedFolder.id);
      } else if (selectedFolder === null) {
        loadAllTests();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to move test:', message);
      alert('Failed to move test. Please try again.');
    }
  };

  const handleEditFolderClick = (folder: Folder) => {
    setEditingFolder(folder);
    setShowEditModal(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Folder List */}
      <FolderList
        folders={folders}
        selectedFolder={selectedFolder || null}
        onFolderSelect={onFolderSelect}
        onEditFolder={handleEditFolderClick}
        onDeleteFolder={handleDeleteFolder}
        onCreateFolder={() => setShowCreateModal(true)}
      />

      {/* Test List */}
      <TestList
        tests={tests}
        folders={folders}
        selectedFolder={selectedFolder || null}
        onTestSelect={onTestSelect}
        onMoveTest={handleMoveTest}
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateFolder}
        loading={loading}
      />

      {/* Edit Folder Modal */}
      <EditFolderModal
        isOpen={showEditModal}
        folder={editingFolder}
        onClose={() => {
          setShowEditModal(false);
          setEditingFolder(null);
        }}
        onSubmit={handleEditFolder}
        loading={loading}
      />
    </div>
  );
}
