import express from 'express';
import { createClient, AuthType } from 'webdav';
import mammoth from 'mammoth';
import * as pdf from 'pdf-parse';

// --- Configuration ---
const PORT = process.env.PORT || 3001;
const NC_URL = process.env.NEXTCLOUD_URL?.replace(/\/$/, '');
const NC_USER = process.env.NEXTCLOUD_USER;
const NC_PASS = process.env.NEXTCLOUD_PASSWORD;
const NC_ROOT = process.env.NEXTCLOUD_ROOT_FOLDER || 'FAQ-Bot-Project';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!NC_URL || !NC_USER || !NC_PASS) {
  console.error("Missing NEXTCLOUD configuration in environment variables.");
  process.exit(1);
}

// --- WebDAV Client ---
const client = createClient(
  `${NC_URL}/remote.php/dav/files/${NC_USER}/`,
  {
    authType: AuthType.Password,
    username: NC_USER,
    password: NC_PASS
  }
);

const app = express();
app.use(express.json() as express.RequestHandler);

// --- Helper Functions ---

const convertPdfToText = async (buffer: Buffer): Promise<string> => {
  const data = await (pdf as any)(buffer);
  return data.text;
};

const convertDocxToText = async (buffer: Buffer): Promise<string> => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

const processFile = async (filePath: string, fileName: string) => {
  console.log(`Processing: ${fileName}`);

  try {
    // 1. Download
    const fileContents = await client.getFileContents(filePath, { format: 'binary' }) as Buffer;

    // 2. Convert
    let text = '';
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      text = await convertPdfToText(fileContents);
    } else if (ext === 'docx') {
      text = await convertDocxToText(fileContents);
    } else {
      console.log(`Skipping unsupported file type: ${ext}`);
      return;
    }

    // 3. Clean Text (Basic)
    text = text.replace(/\n\s*\n/g, '\n\n').trim();

    // 4. Upload to Bot Memory
    const targetName = fileName.replace(/\.(pdf|docx)$/i, '.txt');
    const targetPath = `${NC_ROOT}/02-Bot-Memory/${targetName}`;
    
    await client.putFileContents(targetPath, text);
    console.log(`Success: Saved extracted text to ${targetPath}`);

  } catch (err) {
    console.error(`Error processing ${fileName}:`, err);
  }
};

// --- Webhook Endpoint ---
app.post('/nextcloud-webhook', async (req, res) => {
  // 1. Verify Secret (Optional but recommended)
  // Nextcloud webhooks often send the secret in a header or query param depending on the app used (Flow, etc.)
  // Here we assume a simple query param ?secret=XYZ for simplicity
  if (WEBHOOK_SECRET && req.query.secret !== WEBHOOK_SECRET) {
    res.status(403).send('Invalid Secret');
    return;
  }

  const payload = req.body;
  console.log('Webhook received:', JSON.stringify(payload));

  /**
   * Payload parsing depends on the Nextcloud Webhook App configuration.
   * Assuming standard format: { "file": "path/to/file.pdf", "event": "create" }
   * Adjust parsing logic based on your specific Nextcloud plugin.
   */
  
  const rawPath = payload.file || payload.path; // Adjust based on your webhook payload structure
  
  if (!rawPath) {
    res.status(400).send('No file path in payload');
    return;
  }

  // 2. Security/Logic Check: Only process files in 01-Upload-Here
  const watchedFolder = `${NC_ROOT}/01-Upload-Here`;
  if (!rawPath.includes(watchedFolder)) {
    console.log(`Ignored file outside watched folder: ${rawPath}`);
    res.status(200).send('Ignored');
    return;
  }

  const fileName = rawPath.split('/').pop();
  
  // 3. Process
  // We don't await this so the webhook request returns immediately (Nextcloud likes fast responses)
  processFile(rawPath, fileName);

  res.status(200).send('Processing started');
});

app.listen(PORT, () => {
  console.log(`Middleware Server listening on port ${PORT}`);
  console.log(`Watched Folder: ${NC_ROOT}/01-Upload-Here`);
});