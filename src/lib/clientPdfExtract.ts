import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ClientPdfResult {
  text: string;
  pages: number;
  info?: any;
}

export async function extractPdfText(file: File): Promise<ClientPdfResult> {
  try {
    console.log('Client-side PDF extraction starting...');
    
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    console.log('PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    const pages = pdf.numPages;
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= pages; pageNum++) {
      console.log(`Processing page ${pageNum}/${pages}`);
      
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Concatenate text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      
      console.log(`Page ${pageNum} text length:`, pageText.length);
    }
    
    // Get PDF metadata
    const metadata = await pdf.getMetadata();
    
    console.log('Client-side PDF extraction completed. Total text length:', fullText.length);
    
    return {
      text: fullText.trim(),
      pages,
      info: metadata
    };
    
  } catch (error) {
    console.error('Client-side PDF extraction failed:', error);
    throw new Error(`Client-side PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function isPdfSupported(): Promise<boolean> {
  try {
    // Test if pdfjs-dist is working
    const testArray = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
    const loadingTask = pdfjsLib.getDocument({ data: testArray });
    await loadingTask.promise;
    return true;
  } catch {
    return false;
  }
}
