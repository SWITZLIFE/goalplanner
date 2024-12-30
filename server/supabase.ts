import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing Supabase credentials');
}

// Create two clients - one for public operations and one for admin operations
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
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
    console.log('Starting file upload to Supabase...', {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    });

    // First check if bucket exists, if not create it
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.error('Error checking buckets:', bucketError);
      throw bucketError;
    }

    console.log('Current buckets:', buckets.map(b => b.name));

    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      console.log('Bucket does not exist, creating...');
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }
      console.log('Bucket created successfully');
    }

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`; // Store in root of bucket

    console.log('Preparing to upload file:', {
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
    const { data: urlData, error: urlError } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (urlError) {
      console.error('Failed to get public URL:', urlError);
      throw urlError;
    }

    if (!urlData) {
      throw new Error('No URL data returned from Supabase');
    }

    console.log('File uploaded successfully:', {
      publicUrl: urlData.publicUrl,
      fileData: data
    });

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error);
    throw error;
  }
}