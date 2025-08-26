'use client';

import React, { useState, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { TestHistory, Folder } from '@/types';
import { Card } from '@/components/ui';

interface TestListProps {
  tests: TestHistory[];
  folders: Folder[];
  selectedFolder?: Folder | null;
  onTestSelect: (test: TestHistory) => void;
  onMoveTest: (testId: string, folderId: string | null) => void;
}

export default function TestList({
  tests,
  folders,
  selectedFolder,
  onTestSelect,
  onMoveTest
}: TestListProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const target = event.target as HTMLElement;
        const isDropdownClick = target.closest('[data-dropdown-trigger]') || 
                               target.closest('[data-dropdown-content]');
        
        if (!isDropdownClick) {
          setOpenDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const formatDate = (date: Date | any) => {
    try {
      // Handle Firestore Timestamp objects
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getTestFolder = (test: TestHistory) => {
    if (!test.folderId) return null;
    return folders.find(f => f.id === test.folderId);
  };

  // Empty state when no folder is selected
  if (selectedFolder === undefined) {
    return (
      <Card className="text-center py-12">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a View</h3>
        <p className="text-sm text-gray-600">
          Choose &quot;All Tests&quot; to see all your tests, or select a specific folder to view tests in that folder.
        </p>
      </Card>
    );
  }

  // Empty state when folder is selected but has no tests
  if (tests.length === 0) {
    return (
      <Card className="text-center py-8">
        <p className="text-gray-500">
          {selectedFolder ? 'No tests in this folder yet.' : 'No tests created yet.'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tests.map((test) => {
        const testFolder = getTestFolder(test);
        
        return (
          <Card key={test.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => onTestSelect(test)}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600">
                    {test.testName}
                  </h3>
                  {testFolder && (
                    <div className="flex items-center space-x-1">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: testFolder.color }}
                      />
                      <span className="text-xs text-gray-500">{testFolder.name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Score: {test.score}%</span>
                  <span>{test.questions?.length || 0} questions</span>
                  <span>{formatDate(test.createdAt)}</span>
                  {test.completedAt && (
                    <span className="text-green-600">Completed</span>
                  )}
                </div>
              </div>

              {/* Test Actions Dropdown */}
              <div className="relative ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === `test-${test.id}` ? null : `test-${test.id}`);
                  }}
                  className="p-2 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                  data-dropdown-trigger
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                
                {openDropdownId === `test-${test.id}` && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[180px] z-10" data-dropdown-content>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                      Move to Folder
                    </div>
                    
                    {/* Unorganized Option */}
                    <button
                      onClick={() => {
                        onMoveTest(test.id, null);
                        setOpenDropdownId(null);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        !test.folderId ? 'text-indigo-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      Unorganized
                    </button>
                    
                    {/* Folder Options */}
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          onMoveTest(test.id, folder.id);
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
          </Card>
        );
      })}
    </div>
  );
}
