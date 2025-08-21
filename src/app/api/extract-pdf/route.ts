import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function POST(request: NextRequest) {
  try {
    console.log('PDF extraction API called');
    
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      console.error('No file provided to PDF API');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('Processing PDF file:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Check file size
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      console.error('File too large:', file.size);
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    try {
      // Try pdf-parse first
      console.log('Trying pdf-parse...');
      const pdf = (await import('pdf-parse')).default;

      // Convert file to buffer
      console.log('Converting file to buffer...');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      console.log('Buffer created, size:', buffer.length);

      // Extract text from PDF using pdf-parse
      console.log('Extracting text from PDF with pdf-parse...');
      const pdfData = await pdf(buffer);
      
      console.log('PDF extraction completed. Pages:', pdfData.numpages, 'Text length:', pdfData.text?.length || 0);
      
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        console.warn('PDF contains no text content');
        return NextResponse.json({ 
          error: 'No text content found in PDF. The file might be image-based or contain only scanned pages.',
          pages: pdfData.numpages,
          info: pdfData.info 
        }, { status: 422 });
      }
      
      return NextResponse.json({ 
        text: pdfData.text,
        pages: pdfData.numpages,
        info: pdfData.info 
      });
    } catch (pdfError) {
      console.error('pdf-parse failed, trying PDF.js...', pdfError);
      
      try {
        // Fallback to PDF.js
        console.log('Trying PDF.js extraction...');
        const bytes = await file.arrayBuffer();
        
        // Load PDF with PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdfDocument = await loadingTask.promise;
        
        console.log('PDF.js loaded document, pages:', pdfDocument.numPages);
        
        let extractedText = '';
        let totalPages = pdfDocument.numPages;
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          console.log(`Extracting text from page ${pageNum}...`);
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          
          extractedText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
        }
        
        console.log('PDF.js extraction completed. Text length:', extractedText.length);
        
        if (!extractedText.trim()) {
          console.warn('PDF.js found no text content');
          return NextResponse.json({ 
            error: 'No text content found in PDF. The file might be image-based or contain only scanned pages.',
            pages: totalPages,
            method: 'pdfjs'
          }, { status: 422 });
        }
        
        return NextResponse.json({ 
          text: extractedText,
          pages: totalPages,
          method: 'pdfjs'
        });
        
      } catch (pdfjsError) {
        console.error('PDF.js also failed:', pdfjsError);
        
        // Check if it's a password-protected PDF
        if (pdfjsError.message && pdfjsError.message.includes('password')) {
          return NextResponse.json(
            { error: 'This PDF is password-protected. Please remove the password and try again.' },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { error: 'Failed to extract text from PDF. The file might be corrupted, password-protected, or in an unsupported format.' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('PDF extraction API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF. Please try a different file format.' },
      { status: 500 }
    );
  }
} 