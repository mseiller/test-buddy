'use client';

import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Image } from 'lucide-react';
import { FileProcessorNew } from '@/services/fileProcessorNew';
import { FileUpload as FileUploadType } from '@/types';
import { useUserPlan } from '@/contexts/UserPlanContext';
import { getPlanFeatures } from '@/config/plans';

interface FileUploadProps {
  onFileProcessed: (fileUpload: FileUploadType) => void;
  onError: (error: string) => void;
  selectedFolder?: { id: string; name: string; color?: string } | null;
  onUpgradeClick?: () => void;
}

export default function FileUpload({ onFileProcessed, onError, selectedFolder, onUpgradeClick }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<FileUploadType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { plan } = useUserPlan();
  const planFeatures = getPlanFeatures(plan);
  const canUploadImages = planFeatures.imageUpload;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragOver to false if we're leaving the main container
    if (e.currentTarget === e.target) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped:', files.map(f => f.name));
    
    if (files.length === 0) {
      console.log('No files in drop event');
      return;
    }
    
    handleMultipleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    handleMultipleFiles(Array.from(files));
  };

  const handleMultipleFiles = async (files: File[]) => {
    // Validate all files
    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      
      // Check if image upload is allowed for this plan
      if (isImage && !canUploadImages) {
        onError(`Image upload is a Pro feature. ${file.name} requires a Pro subscription to process.`);
        if (onUpgradeClick) onUpgradeClick();
        return;
      }
      
      if (!FileProcessorNew.validateFileType(file.name, canUploadImages)) {
        const supportedTypes = canUploadImages 
          ? '.txt, .pdf, .doc, .docx, .csv, .xls, .xlsx, .jpg, .jpeg, .png'
          : '.txt, .pdf, .doc, .docx, .csv, .xls, .xlsx';
        onError(`Unsupported file type: ${file.name}. Please upload ${supportedTypes} files.`);
        return;
      }

      const maxSize = isImage ? 10 * 1024 * 1024 : FileProcessorNew.getMaxFileSize(); // 10MB for images, 15MB for others
      if (file.size > maxSize) {
        const sizeLimit = isImage ? '10MB' : '15MB';
        onError(`File too large: ${file.name}. Please upload files smaller than ${sizeLimit}.`);
        return;
      }
    }

    setProcessing(true);
    try {
      let combinedText = '';
      const fileNames: string[] = [];

      for (const file of files) {
        const extractedText = await FileProcessorNew.extractTextFromFile(file);
        
        if (extractedText.trim()) {
          combinedText += `\n\n--- ${file.name} ---\n\n${extractedText}`;
          fileNames.push(file.name);
        }
      }
      
      if (!combinedText.trim()) {
        onError('No text could be extracted from any of the files. Please try different files or manually enter text.');
        return;
      }

      // Determine file type
      let fileType = 'multiple';
      if (files.length === 1) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else {
          const extension = file.name.split('.').pop()?.toLowerCase() || '';
          fileType = extension;
        }
      }

      const fileUpload: FileUploadType = {
        file: files[0], // Use first file as representative
        extractedText: combinedText,
        fileName: files.length === 1 ? files[0].name : `${files.length} files: ${fileNames.join(', ')}`,
        fileType: fileType,
      };

      setUploadedFile(fileUpload);
      onFileProcessed(fileUpload);
    } catch (error: any) {
      onError(error.message || 'Failed to process files');
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = async (file: File) => {
    await handleMultipleFiles([file]);
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSupportedFormats = () => {
    const baseFormats = ['.txt', '.pdf', '.doc', '.docx', '.csv', '.xls', '.xlsx'];
    if (canUploadImages) {
      return [...baseFormats, '.jpg', '.jpeg', '.png'];
    }
    return baseFormats;
  };

  if (uploadedFile) {
    return (
      <div className="bg-white rounded-lg border-2 border-green-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">File Processed Successfully</h3>
              <p className="text-sm text-gray-600">{uploadedFile.fileName}</p>
              <p className="text-xs text-gray-500 mt-1">
                Extracted {uploadedFile.extractedText.length} characters
              </p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-md max-h-32 overflow-y-auto">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {uploadedFile.extractedText.substring(0, 300)}
            {uploadedFile.extractedText.length > 300 && '...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Show selected folder if any */}
      {selectedFolder && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: selectedFolder.color || '#3B82F6' }}
            />
            <span className="text-sm font-medium text-gray-700">
              Creating test in folder: <span className="font-semibold">{selectedFolder.name}</span>
            </span>
          </div>
        </div>
      )}

      <div 
        className={`bg-white rounded-lg border-2 border-dashed p-8 transition-all duration-200 ease-in-out ${
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {processing ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Processing file...</p>
              <p className="text-sm text-gray-600">Extracting text content</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload files to create a quiz
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop files here, or click to browse
              </p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <File className="h-4 w-4 mr-2" />
                Choose File
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={getSupportedFormats().join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="mt-4 text-xs text-gray-500">
                <p className="mb-1">Supported formats:</p>
                <p>{getSupportedFormats().join(', ')}</p>
                <div className="mt-1 space-y-1">
                  <p>Maximum file size: 15MB (PDFs limited to 4MB{canUploadImages ? ', Images limited to 10MB' : ''})</p>
                  {canUploadImages && (
                    <p className="text-green-600 flex items-center">
                      <Image className="h-3 w-3 mr-1" />
                      Pro Feature: Image text extraction enabled
                    </p>
                  )}
                  {!canUploadImages && (
                    <p className="text-amber-600">
                      📸 Image upload (.jpg, .png) available with Pro plan
                    </p>
                  )}
                  <p className="mt-1 text-indigo-600">Note: Multiple files will be combined</p>
                </div>
              </div>
            </>
          )}
        </div>
      
      {dragOver && (
        <div className="absolute inset-0 bg-indigo-50 bg-opacity-75 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-indigo-600 mb-2" />
            <p className="text-sm font-medium text-indigo-600">Drop your files here</p>
          </div>
        </div>
      )}
      </div>
    </>
  );
} 