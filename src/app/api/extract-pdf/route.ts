import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Dynamic import to avoid bundling issues
    const pdf = (await import('pdf-parse')).default;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF
    const pdfData = await pdf(buffer);
    
    return NextResponse.json({ 
      text: pdfData.text,
      pages: pdfData.numpages,
      info: pdfData.info 
    });
  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF. Please try a different file format.' },
      { status: 500 }
    );
  }
} 