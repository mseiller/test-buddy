import { NextRequest, NextResponse } from 'next/server';

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
      // Dynamic import to avoid bundling issues
      console.log('Importing pdf-parse...');
      const pdf = (await import('pdf-parse')).default;

      // Convert file to buffer
      console.log('Converting file to buffer...');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      console.log('Buffer created, size:', buffer.length);

      // Extract text from PDF
      console.log('Extracting text from PDF...');
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
      console.error('PDF parsing error:', pdfError);
      return NextResponse.json(
        { error: 'Failed to parse PDF. The file might be corrupted or password-protected.' },
        { status: 500 }
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