import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Simple test API called');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('File received:', {
      name: file?.name,
      type: file?.type,
      size: file?.size,
      exists: !!file
    });
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Try to read the file
    const bytes = await file.arrayBuffer();
    console.log('File bytes length:', bytes.byteLength);
    
    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      bytesLength: bytes.byteLength
    });
    
  } catch (error: any) {
    console.log('Simple test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
