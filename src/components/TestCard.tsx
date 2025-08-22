'use client';

import { useState } from 'react';
import { TestDoc } from '@/types';
import { FileText, Tag, Calendar, MoreVertical, Move, Edit, Trash2 } from 'lucide-react';
import { MoveTestDialog } from './MoveTestDialog';

interface TestCardProps {
  test: TestDoc;
}

export function TestCard({ test }: TestCardProps) {
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-gray-900 truncate mb-1">
              {test.name}
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <FileText className="h-4 w-4 mr-1" />
              {test.sourceFile?.name || 'No file'}
            </div>
          </div>
          
          {/* Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowMoveDialog(true);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Move className="h-4 w-4 mr-2" />
                    Move to Folder
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* File Info */}
        {test.sourceFile && (
          <div className="mb-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Size: {formatFileSize(test.sourceFile.size)}</span>
              <span>Type: {test.sourceFile.type}</span>
            </div>
          </div>
        )}

        {/* Meta Info */}
        {test.meta && (
          <div className="mb-3 text-sm text-gray-600">
            {test.meta.pages && (
              <div className="flex items-center mb-1">
                <span className="mr-2">Pages: {test.meta.pages}</span>
              </div>
            )}
            {test.meta.extractionMs && (
              <div className="flex items-center mb-1">
                <span className="mr-2">Extraction: {test.meta.extractionMs}ms</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {test.tags && test.tags.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center mb-2">
              <Tag className="h-3 w-3 text-gray-400 mr-1" />
              <span className="text-xs text-gray-500">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {test.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(test.createdAt)}
          </div>
          <div className="flex items-center">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              test.questionsIndexReady 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {test.questionsIndexReady ? 'Ready' : 'Processing'}
            </span>
          </div>
        </div>
      </div>

      {/* Move Test Dialog */}
      <MoveTestDialog
        open={showMoveDialog}
        onClose={() => setShowMoveDialog(false)}
        test={test}
      />
    </div>
  );
}
