import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to upload file to Supabase Storage
export async function uploadFileToSupabase(
  file: Express.Multer.File,
  bucket: string = 'images'
) {
  try {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // First try to create bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucket);
    
    if (!bucketExists) {
      const { data: newBucket, error: createError } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      
      if (createError) {
        console.error('Failed to create bucket:', createError);
        throw createError;
      }
    }

    // Upload the file
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Failed to upload file:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error);
    throw error;
  }
}
