import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryResult {
  secure_url: string;
  [key: string]: any;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: File): Promise<string> {
  try {
    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64String}`;

    // Upload to Cloudinary
    const result = await new Promise<CloudinaryResult>((resolve, reject) => {
      cloudinary.uploader.upload(
        dataURI,
        {
          folder: 'gallery',
        },
        (error: Error | null, result: CloudinaryResult) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    // Return the secure URL of the uploaded image
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
} 