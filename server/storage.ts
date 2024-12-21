const prefix = 'vision-board/';

// Initialize the storage client
async function setItem(key: string, value: string): Promise<void> {
  const response = await fetch(process.env.REPLIT_DB_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  });
  
  if (!response.ok) {
    throw new Error(`Failed to store item: ${response.statusText}`);
  }
}

async function getItem(key: string): Promise<string | null> {
  const response = await fetch(`${process.env.REPLIT_DB_URL}/${encodeURIComponent(key)}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to get item: ${response.statusText}`);
  }
  return response.text();
}

async function deleteItem(key: string): Promise<void> {
  const response = await fetch(process.env.REPLIT_DB_URL!, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: encodeURIComponent(key)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete item: ${response.statusText}`);
  }
}

// Generate a unique key for storing user files
export function generateStorageKey(userId: number, filename: string) {
  const timestamp = Date.now();
  return `${prefix}${userId}/${timestamp}-${filename}`;
}

// Store a file in Object Storage
export async function storeFile(userId: number, file: Express.Multer.File): Promise<string> {
  const key = generateStorageKey(userId, file.originalname);
  await setItem(key, file.buffer.toString('base64'));
  return key;
}

// Get a file from Object Storage
export async function getFile(key: string): Promise<Buffer | null> {
  try {
    const base64Data = await getItem(key);
    if (!base64Data) return null;
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error retrieving file:', error);
    return null;
  }
}

// Delete a file from Object Storage
export async function deleteFile(key: string): Promise<boolean> {
  try {
    await deleteItem(key);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}
