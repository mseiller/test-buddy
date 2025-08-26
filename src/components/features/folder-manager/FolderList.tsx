'use client';

import React, { useState, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Folder } from '@/types';
import { Button } from '@/components/ui';

interface FolderListProps {
  folders: Folder[];
  selectedFolder?: Folder | null;
  onFolderSelect: (folder: Folder | null) => void;
  onEditFolder: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateFolder: () => void;
}

export default function FolderList({
  folders,
  selectedFolder,
  onFolderSelect,
  onEditFolder,
  onDeleteFolder,
  onCreateFolder
}: FolderListProps) {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const target = event.target as HTMLElement;
        // Check if the click is inside a dropdown or dropdown trigger
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

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Organize Your Tests</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={onCreateFolder}
        >
          New Folder
        </Button>
      </div>

      {/* Folder Navigation */}
      <div className="flex items-center space-x-2 mb-4">
        {/* All Tests Button */}
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
        
        {/* Individual Folder Buttons */}
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
            
            {/* Folder Actions Dropdown */}
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
                      onEditFolder(folder);
                      setOpenDropdownId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-gray-700"
                  >
                    Edit Folder
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${folder.name}"? Tests in this folder will be moved to "Unorganized".`)) {
                        onDeleteFolder(folder.id);
                      }
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
  );
}
