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
    // For client-side PDF processing, we'll use a different approach
    // Since pdf-parse doesn't work in browser, we'll create an API endpoint
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/extract-pdf', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to extract PDF text');
    }
    
    const result = await response.json();
    return result.text;
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
    return 10 * 1024 * 1024; // 10MB
  }
} 