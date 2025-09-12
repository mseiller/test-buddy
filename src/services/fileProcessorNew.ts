import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { safeConsole } from '@/utils/console';
import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';

export class FileProcessorNew {
  static async extractTextFromFile(file: File): Promise<string> {
    const fileType = this.getFileType(file.name);
    
    switch (fileType) {
      case 'txt':
        return this.extractFromTxt(file);
      case 'pdf':
        return this.extractFromPdf(file);
      case 'doc':
        return this.extractFromDoc(file);
      case 'docx':
        return this.extractFromDocx(file);
      case 'csv':
        return this.extractFromCsv(file);
      case 'xls':
      case 'xlsx':
        return this.extractFromExcel(file);
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'heic':
        return this.extractFromImage(file);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private static getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || '';
  }

  private static async handleHeicFile(file: File): Promise<never> {
    console.log('HEIC HANDLING - HEIC file detected:', file.name, 'Size:', file.size);
    
    // Provide a concise error message that will display nicely in the UI
    throw new Error('HEIC files are not supported. Please convert to JPEG using your phone settings (Camera > Formats > Most Compatible) or an online converter, then try again.');
  }

  private static async chunkPdf(file: File): Promise<File[]> {
    console.log('PDF CHUNKING - Starting PDF chunking for file:', file.name, 'Size:', file.size);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      console.log('PDF CHUNKING - PDF has', pageCount, 'pages');
      
      // If PDF is small enough, return as single file
      if (file.size <= 2.5 * 1024 * 1024) {
        console.log('PDF CHUNKING - PDF is small enough, no chunking needed');
        return [file];
      }
      
      // Calculate pages per chunk (aim for ~1.8MB chunks to be safer)
      const targetChunkSize = 1.8 * 1024 * 1024;
      const estimatedPageSize = file.size / pageCount;
      const pagesPerChunk = Math.max(1, Math.floor(targetChunkSize / estimatedPageSize));
      
      console.log('PDF CHUNKING - Estimated pages per chunk:', pagesPerChunk);
      
      const chunks: File[] = [];
      
      for (let startPage = 0; startPage < pageCount; startPage += pagesPerChunk) {
        const endPage = Math.min(startPage + pagesPerChunk - 1, pageCount - 1);
        
        // Create new PDF with selected pages
        const chunkDoc = await PDFDocument.create();
        const copiedPages = await chunkDoc.copyPages(pdfDoc, Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i));
        
        copiedPages.forEach((page) => chunkDoc.addPage(page));
        
        const chunkBytes = await chunkDoc.save();
        const chunkFile = new File([new Uint8Array(chunkBytes)], `${file.name.replace('.pdf', '')}_part${Math.floor(startPage / pagesPerChunk) + 1}.pdf`, { type: 'application/pdf' });
        
        chunks.push(chunkFile);
        console.log(`PDF CHUNKING - Created chunk ${Math.floor(startPage / pagesPerChunk) + 1}: pages ${startPage + 1}-${endPage + 1}, size: ${chunkFile.size} bytes`);
      }
      
      console.log('PDF CHUNKING - Created', chunks.length, 'chunks');
      return chunks;
    } catch (error) {
      console.error('PDF CHUNKING - Failed to chunk PDF:', error);
      throw new Error('Failed to process large PDF. Please try splitting it manually or use a smaller PDF.');
    }
  }

  private static async compressImage(file: File): Promise<File> {
    console.log('COMPRESSION - Original file size:', file.size, 'bytes');
    
    const options = {
      maxSizeMB: 3.5, // Target 3.5MB to stay well under 4MB Vercel limit
      maxWidthOrHeight: 1920, // Maintain good quality
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.8,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log('COMPRESSION - Compressed file size:', compressedFile.size, 'bytes');
      console.log('COMPRESSION - Size reduction:', Math.round((1 - compressedFile.size / file.size) * 100) + '%');
      
      return compressedFile;
    } catch (error) {
      console.warn('COMPRESSION - Failed to compress image, using original:', error);
      return file;
    }
  }

  private static async extractFromTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string || '');
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private static async extractFromPdf(file: File): Promise<string> {
    console.log('NEW PDF PROCESSOR - Starting PDF extraction for file:', file.name, 'Size:', file.size);
    
    // Check if PDF needs chunking
    if (file.size > 2.5 * 1024 * 1024) {
      console.log('NEW PDF PROCESSOR - PDF is large, chunking into smaller parts...');
      const chunks = await this.chunkPdf(file);
      
      let combinedText = '';
      for (let i = 0; i < chunks.length; i++) {
        console.log(`NEW PDF PROCESSOR - Processing chunk ${i + 1}/${chunks.length}`);
        const chunkText = await this.extractFromPdfChunk(chunks[i]);
        combinedText += `\n\n--- Part ${i + 1} ---\n\n${chunkText}`;
      }
      
      console.log('NEW PDF PROCESSOR - All chunks processed. Total text length:', combinedText.length);
      return combinedText;
    }
    
    return this.extractFromPdfChunk(file);
  }

  private static async extractFromPdfChunk(file: File): Promise<string> {
    console.log('NEW PDF PROCESSOR - Processing PDF chunk:', file.name, 'Size:', file.size);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('NEW PDF PROCESSOR - Sending PDF chunk to API endpoint...');
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });
      
      console.log('NEW PDF PROCESSOR - PDF API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        safeConsole.error('NEW PDF PROCESSOR - PDF API error response:', errorText);
        
        // If server fails, provide helpful error message
        console.error('NEW PDF PROCESSOR - Server failed with status:', response.status);
        throw new Error(`PDF processing failed (Server error ${response.status}). Please try a smaller PDF or contact support if the issue persists.`);
      }
      
      const result = await response.json();
      safeConsole.log('NEW PDF PROCESSOR - PDF extraction successful. Pages:', result.pages, 'Text length:', result.text?.length || 0);
      
      if (!result.text || result.text.trim().length === 0) {
        safeConsole.warn('NEW PDF PROCESSOR - PDF extracted but contains no text content');
        throw new Error('No text content found in PDF. The file might be image-based or corrupted.');
      }
      
      return result.text;
    } catch (error) {
      safeConsole.error('NEW PDF PROCESSOR - PDF extraction failed:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async extractFromDoc(file: File): Promise<string> {
    safeConsole.log('NEW DOC PROCESSOR - Starting DOC extraction for file:', file.name, 'Size:', file.size);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          safeConsole.log('NEW DOC PROCESSOR - Extracting text from DOC file...');
          const result = await mammoth.extractRawText({ arrayBuffer });
          safeConsole.log('NEW DOC PROCESSOR - DOC extraction successful. Text length:', result.value?.length || 0);
          resolve(result.value);
        } catch (error) {
          safeConsole.error('NEW DOC PROCESSOR - DOC extraction failed:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractFromDocx(file: File): Promise<string> {
    safeConsole.log('NEW DOCX PROCESSOR - Starting DOCX extraction for file:', file.name, 'Size:', file.size);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          safeConsole.log('NEW DOCX PROCESSOR - Extracting text from DOCX file...');
          const result = await mammoth.extractRawText({ arrayBuffer });
          safeConsole.log('NEW DOCX PROCESSOR - DOCX extraction successful. Text length:', result.value?.length || 0);
          
          // Debug: Show the first 200 characters of extracted text
          if (result.value) {
            safeConsole.log('NEW DOCX PROCESSOR - First 200 chars of extracted text:', result.value.substring(0, 200));
            safeConsole.log('NEW DOCX PROCESSOR - Trimmed text length:', result.value.trim().length);
          }
          
          if (!result.value) {
            safeConsole.warn('NEW DOCX PROCESSOR - DOCX extraction returned null/undefined');
            throw new Error('No text content found in DOCX file. The file might be corrupted or contain only images.');
          }
          
          const trimmedText = result.value.trim();
          if (trimmedText.length === 0) {
            safeConsole.warn('NEW DOCX PROCESSOR - DOCX extracted but contains only whitespace');
            throw new Error('No text content found in DOCX file. The file might be corrupted or contain only images.');
          }
          
          safeConsole.log('NEW DOCX PROCESSOR - Successfully extracted text, length:', trimmedText.length);
          resolve(trimmedText);
        } catch (error) {
          safeConsole.error('NEW DOCX PROCESSOR - DOCX extraction failed:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        safeConsole.error('NEW DOCX PROCESSOR - FileReader error:', error);
        reject(error);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractFromCsv(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string || '';
        // Convert CSV to readable text format
        const lines = text.split('\n');
        const formattedText = lines
          .map(line => line.split(',').join(' | '))
          .join('\n');
        resolve(formattedText);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private static async extractFromExcel(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          let extractedText = '';
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const sheetText = XLSX.utils.sheet_to_txt(worksheet);
            extractedText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
          });
          
          resolve(extractedText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractFromImage(file: File): Promise<string> {
    console.log('NEW IMAGE PROCESSOR - Starting image OCR for file:', file.name, 'Size:', file.size);
    
    // Handle HEIC files
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      console.log('NEW IMAGE PROCESSOR - HEIC file detected, providing conversion instructions...');
      await this.handleHeicFile(file);
    }
    
    let processedFile = file;
    
    // Compress image if it's larger than 3MB to ensure it stays under 4MB limit
    if (processedFile.size > 3 * 1024 * 1024) {
      console.log('NEW IMAGE PROCESSOR - Compressing large image...');
      processedFile = await this.compressImage(processedFile);
    }
    
    // Final size check after compression
    if (processedFile.size > 4 * 1024 * 1024) {
      console.log('NEW IMAGE PROCESSOR - File is still too large after compression:', processedFile.size);
      throw new Error('Image file is too large even after compression. Please try a smaller or lower quality image.');
    }
    
    try {
      const formData = new FormData();
      formData.append('file', processedFile);
      
      console.log('NEW IMAGE PROCESSOR - Sending image to OCR API endpoint...');
      console.log('NEW IMAGE PROCESSOR - Original size:', file.size, 'bytes');
      console.log('NEW IMAGE PROCESSOR - Processed size:', processedFile.size, 'bytes');
      console.log('NEW IMAGE PROCESSOR - Current URL:', window.location.href);
      console.log('NEW IMAGE PROCESSOR - API URL:', '/api/extract-image');
      
      const response = await fetch('/api/extract-image', {
        method: 'POST',
        body: formData,
      });
      
      console.log('NEW IMAGE PROCESSOR - OCR API response status:', response.status);
      console.log('NEW IMAGE PROCESSOR - Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Image file is too large for processing. Please compress your image to under 4MB or use a smaller file.');
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('NEW IMAGE PROCESSOR - OCR API error response:', errorData);
        throw new Error(errorData.error || 'Failed to extract text from image');
      }
      
      const result = await response.json();
      console.log('NEW IMAGE PROCESSOR - Full API response:', result);
      console.log('NEW IMAGE PROCESSOR - OCR extraction successful. Text length:', result.text?.length || 0);
      
      if (!result.text || result.text.trim().length === 0) {
        console.warn('NEW IMAGE PROCESSOR - Image processed but contains no text content');
        console.warn('NEW IMAGE PROCESSOR - Response structure:', Object.keys(result));
        console.warn('NEW IMAGE PROCESSOR - Full result object:', JSON.stringify(result, null, 2));
        throw new Error('No text content found in the image. Please ensure the image contains readable text.');
      }
      
      return result.text;
    } catch (error) {
      safeConsole.error('NEW IMAGE PROCESSOR - Image OCR failed:', error);
      throw new Error(`Image text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static validateFileType(fileName: string, allowImages: boolean = false): boolean {
    let supportedTypes = ['txt', 'pdf', 'doc', 'docx', 'csv', 'xls', 'xlsx'];
    if (allowImages) {
      supportedTypes = [...supportedTypes, 'jpg', 'jpeg', 'png', 'heic'];
    }
    const fileType = this.getFileType(fileName);
    return supportedTypes.includes(fileType);
  }

  static getMaxFileSize(): number {
    return 25 * 1024 * 1024; // 25MB
  }
}
