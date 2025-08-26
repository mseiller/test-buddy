'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit } from 'lucide-react';
import { Folder } from '@/types';
import { Button } from '@/components/ui';

interface EditFolderModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onSubmit: (folderId: string, name: string, description: string, color: string) => Promise<void>;
  loading?: boolean;
}

const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

export default function EditFolderModal({
  isOpen,
  folder,
  onClose,
  onSubmit,
  loading = false
}: EditFolderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);

  // Initialize form when folder changes
  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || '');
      setSelectedColor(folder.color || colorOptions[0]);
    }
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder || !name.trim()) return;
    
    try {
      await onSubmit(folder.id, name.trim(), description.trim(), selectedColor);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    // Reset form to original values
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || '');
      setSelectedColor(folder.color || colorOptions[0]);
    }
    onClose();
  };

  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Edit className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Edit Folder</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Folder Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Folder Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              placeholder="Enter folder name"
              required
              autoFocus
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 resize-none"
              placeholder="Enter folder description"
              rows={2}
            />
          </div>
          
          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex space-x-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    selectedColor === color ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Select ${color}`}
                />
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading || !name.trim()}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
