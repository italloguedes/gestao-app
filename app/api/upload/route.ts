import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/cloudinary';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const username = formData.get('username');

    if (!file || !username) {
      return NextResponse.json(
        { error: 'File and username are required' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const cloudinaryResponse = await uploadImage(file);

    // Save to database
    const db = await getDb();
    await db.run(
      'INSERT INTO images (url, filename, username) VALUES (?, ?, ?)',
      [cloudinaryResponse.secure_url, cloudinaryResponse.original_filename, username]
    );

    return NextResponse.json({
      message: 'Upload successful',
      url: cloudinaryResponse.secure_url,
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