import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export class FileProcessor {
  static async extractTextFromFile(file: File): Promise<string> {
    const fileType = this.getFileType(file.name);
    
    switch (fileType) {
      case 'txt':
        return this.extractFromTxt(file);
      case 'pdf':
        return this.extractFromPdf(file);
      case 'doc':
      case 'docx':
        return this.extractFromDoc(file);
      case 'csv':
        return this.extractFromCsv(file);
      case 'xls':
      case 'xlsx':
        return this.extractFromExcel(file);
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
    console.log('Starting PDF extraction for file:', file.name, 'Size:', file.size);
    
    // For files larger than 4MB, show a helpful error message
    if (file.size > 4 * 1024 * 1024) {
      console.log('File is larger than 4MB, cannot process due to Vercel limits');
      throw new Error('PDF file is too large (over 4MB). Due to platform limitations, we can only process PDFs up to 4MB. Please try compressing your PDF or splitting it into smaller files.');
    }
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('Sending PDF to API endpoint...');
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });
      
      console.log('PDF API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF API error response:', errorText);
        throw new Error(`Failed to extract PDF text: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('PDF extraction successful. Pages:', result.pages, 'Text length:', result.text?.length || 0);
      
      if (!result.text || result.text.trim().length === 0) {
        console.warn('PDF extracted but contains no text content');
        throw new Error('No text content found in PDF. The file might be image-based or corrupted.');
      }
      
      return result.text;
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  private static async extractFromDoc(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
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

  static validateFileType(fileName: string): boolean {
    const supportedTypes = ['txt', 'pdf', 'doc', 'docx', 'csv', 'xls', 'xlsx'];
    const fileType = this.getFileType(fileName);
    return supportedTypes.includes(fileType);
  }

  static getMaxFileSize(): number {
    return 15 * 1024 * 1024; // 15MB
  }
} 