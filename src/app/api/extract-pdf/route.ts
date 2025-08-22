import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30; // seconds

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
    if (file.size > 15 * 1024 * 1024) { // 15MB limit
      console.error('File too large:', file.size);
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 });
    }

    try {
      console.log('Starting PDF processing...');
      
      // Convert file to buffer first
      console.log('Converting file to buffer...');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      console.log('Buffer created, size:', buffer.length);

      // Validate buffer
      if (!buffer || buffer.length === 0) {
        throw new Error('Invalid or empty file buffer');
      }

      // Try to import and use pdf-parse with error handling
      console.log('Importing pdf-parse...');
      let pdf: any;
      try {
        const mod = await import('pdf-parse');
        pdf = mod.default ?? mod;
        console.log('pdf-parse imported successfully');
        
        // Test if the library is working by checking if it's a function
        if (typeof pdf !== 'function') {
          throw new Error('pdf-parse import is not a function');
        }
      } catch (e) {
        console.error('Failed to import or validate pdf-parse:', e);
        return NextResponse.json(
          { 
            error: 'PDF processing library not available or corrupted', 
            originalError: String(e),
            suggestion: 'This may be a bundling issue. Check server logs for more details.'
          },
          { status: 500 }
        );
      }

      // Extract text from PDF using pdf-parse with minimal configuration
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
      console.error('pdf-parse failed with error:', pdfError);
      
      // Provide more specific error information
      let errorMessage = 'Failed to extract text from PDF.';
      let statusCode = 500;
      let originalError = 'Unknown error';
      
      if (pdfError instanceof Error) {
        originalError = pdfError.message;
        const errorMsg = pdfError.message.toLowerCase();
        
        if (errorMsg.includes('password') || errorMsg.includes('encrypted')) {
          errorMessage = 'This PDF is password-protected. Please remove the password and try again.';
          statusCode = 403;
        } else if (errorMsg.includes('invalid') || errorMsg.includes('corrupted')) {
          errorMessage = 'The PDF file appears to be corrupted or in an invalid format.';
          statusCode = 422;
        } else if (errorMsg.includes('unsupported')) {
          errorMessage = 'This PDF format is not supported. Try converting it to a different PDF version.';
          statusCode = 422;
        }
      }
      
      console.error('Final error message:', errorMessage);
      return NextResponse.json(
        { 
          error: errorMessage,
          originalError: originalError,
          suggestion: 'Try converting the PDF to a different format or removing any password protection.'
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('PDF extraction API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF. Please try a different file format.' },
      { status: 500 }
    );
  }
} 