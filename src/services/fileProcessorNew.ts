import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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
        return this.extractFromImage(file);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private static getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension || '';
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
    
    // For files larger than 4MB, show a helpful error message
    if (file.size > 4 * 1024 * 1024) {
      console.log('NEW PDF PROCESSOR - File is larger than 4MB, cannot process due to Vercel limits');
      throw new Error('PDF file is too large (over 4MB). Due to platform limitations, we can only process PDFs up to 4MB. Please try compressing your PDF or splitting it into smaller files.');
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('NEW PDF PROCESSOR - Sending PDF to API endpoint...');
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });
      
      console.log('NEW PDF PROCESSOR - PDF API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('NEW PDF PROCESSOR - PDF API error response:', errorText);
        
        // If server fails, try client-side fallback
        console.log('NEW PDF PROCESSOR - Server failed, trying client-side fallback...');
        try {
          const { extractPdfText } = await import('@/lib/clientPdfExtract');
          console.log('NEW PDF PROCESSOR - Client-side fallback starting...');
          const clientResult = await extractPdfText(file);
          console.log('NEW PDF PROCESSOR - Client-side fallback successful. Text length:', clientResult.text.length);
          return clientResult.text;
        } catch (clientError) {
          console.error('NEW PDF PROCESSOR - Client-side fallback also failed:', clientError);
          throw new Error(`PDF extraction failed on both server and client: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`);
        }
      }
      
      const result = await response.json();
      console.log('NEW PDF PROCESSOR - PDF extraction successful. Pages:', result.pages, 'Text length:', result.text?.length || 0);
      
      if (!result.text || result.text.trim().length === 0) {
        console.warn('NEW PDF PROCESSOR - PDF extracted but contains no text content');
        throw new Error('No text content found in PDF. The file might be image-based or corrupted.');
      }
      
      return result.text;
    } catch (error) {
      console.error('NEW PDF PROCESSOR - PDF extraction failed:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async extractFromDoc(file: File): Promise<string> {
    console.log('NEW DOC PROCESSOR - Starting DOC extraction for file:', file.name, 'Size:', file.size);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          console.log('NEW DOC PROCESSOR - Extracting text from DOC file...');
          const result = await mammoth.extractRawText({ arrayBuffer });
          console.log('NEW DOC PROCESSOR - DOC extraction successful. Text length:', result.value?.length || 0);
          resolve(result.value);
        } catch (error) {
          console.error('NEW DOC PROCESSOR - DOC extraction failed:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractFromDocx(file: File): Promise<string> {
    console.log('NEW DOCX PROCESSOR - Starting DOCX extraction for file:', file.name, 'Size:', file.size);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          console.log('NEW DOCX PROCESSOR - Extracting text from DOCX file...');
          const result = await mammoth.extractRawText({ arrayBuffer });
          console.log('NEW DOCX PROCESSOR - DOCX extraction successful. Text length:', result.value?.length || 0);
          
          // Debug: Show the first 200 characters of extracted text
          if (result.value) {
            console.log('NEW DOCX PROCESSOR - First 200 chars of extracted text:', result.value.substring(0, 200));
            console.log('NEW DOCX PROCESSOR - Trimmed text length:', result.value.trim().length);
          }
          
          if (!result.value) {
            console.warn('NEW DOCX PROCESSOR - DOCX extraction returned null/undefined');
            throw new Error('No text content found in DOCX file. The file might be corrupted or contain only images.');
          }
          
          const trimmedText = result.value.trim();
          if (trimmedText.length === 0) {
            console.warn('NEW DOCX PROCESSOR - DOCX extracted but contains only whitespace');
            throw new Error('No text content found in DOCX file. The file might be corrupted or contain only images.');
          }
          
          console.log('NEW DOCX PROCESSOR - Successfully extracted text, length:', trimmedText.length);
          resolve(trimmedText);
        } catch (error) {
          console.error('NEW DOCX PROCESSOR - DOCX extraction failed:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => {
        console.error('NEW DOCX PROCESSOR - FileReader error:', error);
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
    
    // Check file size (max 10MB for images)
    if (file.size > 10 * 1024 * 1024) {
      console.log('NEW IMAGE PROCESSOR - File is larger than 10MB, cannot process');
      throw new Error('Image file is too large (over 10MB). Please compress your image or use a smaller file.');
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('NEW IMAGE PROCESSOR - Sending image to OCR API endpoint...');
      const response = await fetch('/api/extract-image', {
        method: 'POST',
        body: formData,
      });
      
      console.log('NEW IMAGE PROCESSOR - OCR API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('NEW IMAGE PROCESSOR - OCR API error response:', errorData);
        throw new Error(errorData.error || 'Failed to extract text from image');
      }
      
      const result = await response.json();
      console.log('NEW IMAGE PROCESSOR - OCR extraction successful. Text length:', result.text?.length || 0);
      
      if (!result.text || result.text.trim().length === 0) {
        console.warn('NEW IMAGE PROCESSOR - Image processed but contains no text content');
        throw new Error('No text content found in the image. Please ensure the image contains readable text.');
      }
      
      return result.text;
    } catch (error) {
      console.error('NEW IMAGE PROCESSOR - Image OCR failed:', error);
      throw new Error(`Image text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static validateFileType(fileName: string, allowImages: boolean = false): boolean {
    let supportedTypes = ['txt', 'pdf', 'doc', 'docx', 'csv', 'xls', 'xlsx'];
    if (allowImages) {
      supportedTypes = [...supportedTypes, 'jpg', 'jpeg', 'png'];
    }
    const fileType = this.getFileType(fileName);
    return supportedTypes.includes(fileType);
  }

  static getMaxFileSize(): number {
    return 15 * 1024 * 1024; // 15MB
  }
}
