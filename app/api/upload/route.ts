import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const username = formData.get('username');

    if (!file || !username) {
      return NextResponse.json(
        { error: 'File and username are required' },
        { status: 400 }
      );
    }

    // Save to database
    const db = await getDb();
    await db.run(
      'INSERT INTO images (filename, username, created_at) VALUES (?, ?, ?)',
      [file.name, username, new Date().toISOString()]
    );

    return NextResponse.json({
      message: 'Upload successful',
      filename: file.name
    });
  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const images = await db.all('SELECT * FROM images ORDER BY created_at DESC');
    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
} 