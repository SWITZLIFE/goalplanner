import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing Supabase credentials');
}

// Create two clients - one for public operations and one for admin operations
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!, // Use the environment variable that matches our secret
  {
    auth: {
      persistSession: false, // Don't persist sessions on the server
      autoRefreshToken: false
    }
  }
);

// Additional configuration for storage
const bucketName = 'vision-board';

// Helper function to upload file to Supabase Storage
export async function uploadFileToSupabase(
  file: Express.Multer.File
) {
  try {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`; // Store in root of bucket

    // Verify bucket exists and is accessible
    const { data: buckets, error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError) {
      console.error('Bucket access error:', bucketError);
      throw new Error(`Bucket ${bucketName} is not accessible: ${bucketError.message}`);
    }

    console.log('Uploading file:', {
      bucketName,
      filePath,
      contentType: file.mimetype,
      size: file.size
    });

    // Upload file
    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: true // Allow overwriting
      });

    if (uploadError) {
      console.error('Failed to upload file:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log('File uploaded successfully:', {
      publicUrl,
      fileData: data
    });

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error);
    throw error;
  }
}