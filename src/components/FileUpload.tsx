'use client';

import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { FileProcessor } from '@/services/fileProcessor';
import { FileUpload as FileUploadType } from '@/types';

interface FileUploadProps {
  onFileProcessed: (fileUpload: FileUploadType) => void;
  onError: (error: string) => void;
}

export default function FileUpload({ onFileProcessed, onError }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<FileUploadType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      return;
    }
    
    if (files.length > 1) {
      onError('Please upload only one file at a time. Multiple files are not supported.');
      return;
    }
    
    handleFile(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    if (files.length > 1) {
      onError('Please upload only one file at a time. Multiple files are not supported.');
      return;
    }
    
    handleFile(files[0]);
  };

  const handleFile = async (file: File) => {
    // Validate file type
    if (!FileProcessor.validateFileType(file.name)) {
      onError('Unsupported file type. Please upload .txt, .pdf, .doc, .docx, .csv, .xls, or .xlsx files.');
      return;
    }

    // Validate file size
    if (file.size > FileProcessor.getMaxFileSize()) {
      onError('File size too large. Please upload files smaller than 10MB.');
      return;
    }

    setProcessing(true);
    try {
      const extractedText = await FileProcessor.extractTextFromFile(file);
      
      if (!extractedText.trim()) {
        onError('No text could be extracted from this file. Please try a different file.');
        return;
      }

      const fileUpload: FileUploadType = {
        file,
        extractedText,
        fileName: file.name,
        fileType: file.type || 'unknown',
      };

      setUploadedFile(fileUpload);
      onFileProcessed(fileUpload);
    } catch (error: any) {
      onError(error.message || 'Failed to process file');
    } finally {
      setProcessing(false);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSupportedFormats = () => {
    return ['.txt', '.pdf', '.doc', '.docx', '.csv', '.xls', '.xlsx'];
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
    <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8">
      <div
        className={`relative ${
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        } transition-all duration-200 ease-in-out`}
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
                Upload a file to create a quiz
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag and drop a single file here, or click to browse
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
                accept={getSupportedFormats().join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div className="mt-4 text-xs text-gray-500">
                <p className="mb-1">Supported formats:</p>
                <p>{getSupportedFormats().join(', ')}</p>
                <p className="mt-1">Maximum file size: 10MB</p>
                <p className="mt-1 text-indigo-600">Note: Only one file at a time</p>
              </div>
            </>
          )}
        </div>
      </div>
      
      {dragOver && (
        <div className="absolute inset-0 bg-indigo-50 bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-indigo-600 mb-2" />
            <p className="text-sm font-medium text-indigo-600">Drop your file here</p>
          </div>
        </div>
      )}
    </div>
  );
} 