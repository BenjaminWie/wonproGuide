
import { Document, User, Role, UserStatus } from '../types';

// These should be defined in your build environment (e.g. .env file)
const NC_URL = process.env.NEXTCLOUD_URL?.replace(/\/$/, '');
const NC_USER = process.env.NEXTCLOUD_USER;
const NC_PASS = process.env.NEXTCLOUD_PASSWORD;
const NC_ROOT = process.env.NEXTCLOUD_ROOT_FOLDER || 'FAQ-Bot-Project';

const getAuthHeaders = () => {
  return {
    'Authorization': 'Basic ' + btoa(`${NC_USER}:${NC_PASS}`),
  };
};

export const isNextcloudConfigured = (): boolean => {
  return !!(NC_URL && NC_USER && NC_PASS);
};

// Helper to determine category based on filename (mirrors logic in AdminPanel)
const determineCategory = (name: string): Document['category'] => {
  const n = name.toLowerCase();
  if (n.includes('satzung') || n.includes('vertrag') || n.includes('recht') || n.includes('gbh') || n.includes('genossenschaft')) return 'Recht & Struktur';
  if (n.includes('vision') || n.includes('selbst') || n.includes('werte') || n.includes('konzept') || n.includes('leitbild')) return 'Selbstverständnis & Vision';
  if (n.includes('aufnahme') || n.includes('mitglied') || n.includes('mitwirkung') || n.includes('teilnahme') || n.includes('ag')) return 'Teilnahme & Mitwirkung';
  if (n.includes('protokoll') || n.includes('beschluss') || n.includes('entscheidung') || n.includes('plenum') || n.includes('versammlung')) return 'Entscheidungen & Prozesse';
  return 'Regeln & Hausordnung';
};

export const fetchNextcloudUsers = async (): Promise<User[]> => {
  if (!isNextcloudConfigured()) return [];

  // WebDAV URL to the CSV file
  // Pattern: https://cloud.domain.com/remote.php/dav/files/USER/FOLDER/FILE
  const csvUrl = `${NC_URL}/remote.php/dav/files/${NC_USER}/${NC_ROOT}/99-Admin/users.csv`;
  
  try {
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      if (response.status !== 404) {
         console.warn(`Nextcloud: Failed to fetch users.csv (${response.status})`);
      }
      return [];
    }

    const text = await response.text();
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const users: User[] = [];

    // Check for header
    const startRow = lines[0].toLowerCase().includes('email') ? 1 : 0;

    for (let i = startRow; i < lines.length; i++) {
      // CSV Format: email, role, status
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length >= 2) {
        const email = cols[0];
        const role = cols[1].toUpperCase() === 'ADMIN' ? Role.ADMIN : Role.USER;
        const status = (cols[2]?.toLowerCase() as UserStatus) || 'aktiv';

        if (email.includes('@')) {
          users.push({
            id: `nc-user-${i}`,
            email,
            role,
            status,
            invitedAt: new Date().toISOString()
          });
        }
      }
    }

    console.log(`Nextcloud: Synced ${users.length} users.`);
    return users;

  } catch (e) {
    console.error("Nextcloud User Sync Error:", e);
    return [];
  }
};

/**
 * Fetches documents from Nextcloud.
 * Uses ETags to only download content if the file has changed on the server.
 * Returns the full list of valid documents currently on the server.
 */
export const fetchNextcloudDocuments = async (currentDocs: Document[] = []): Promise<Document[]> => {
  if (!isNextcloudConfigured()) return [];

  const folderUrl = `${NC_URL}/remote.php/dav/files/${NC_USER}/${NC_ROOT}/02-Bot-Memory/`;

  try {
    // PROPFIND to list files with their properties (getetag, getlastmodified)
    const response = await fetch(folderUrl, {
      method: 'PROPFIND',
      headers: {
        ...getAuthHeaders(),
        'Depth': '1', // Only immediate children
        'Content-Type': 'application/xml'
      },
      // Request specific properties
      body: `<?xml version="1.0"?>
        <d:propfind  xmlns:d="DAV:">
          <d:prop>
            <d:getlastmodified/>
            <d:getetag/>
            <d:resourcetype/>
          </d:prop>
        </d:propfind>`
    });

    if (!response.ok) {
      console.warn(`Nextcloud: Failed to access Bot Memory folder (${response.status})`);
      return currentDocs; // Return stale cache on error to prevent wiping UI
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Find all 'response' tags.
    const responses = xmlDoc.getElementsByTagNameNS("*", "response");
    const docs: Document[] = [];
    let downloadCount = 0;

    for (let i = 0; i < responses.length; i++) {
      const resp = responses[i];
      const hrefNode = resp.getElementsByTagNameNS("*", "href")[0];
      const propNode = resp.getElementsByTagNameNS("*", "prop")[0];
      
      let href = hrefNode?.textContent;
      if (!href) continue;
      
      href = decodeURIComponent(href);

      // Filter for .txt files
      if (!href.endsWith('.txt')) continue;

      // Check if it is a directory (shouldn't be based on .txt, but safe check)
      const resType = propNode?.getElementsByTagNameNS("*", "resourcetype")[0];
      if (resType && resType.getElementsByTagNameNS("*", "collection").length > 0) continue;

      // Extract ETag
      let etag = propNode?.getElementsByTagNameNS("*", "getetag")[0]?.textContent || '';
      // Sanitize ETag quotes
      etag = etag.replace(/^["']|["']$/g, '');

      // Extract filename
      const fileName = href.split('/').pop() || 'unknown';
      if (fileName.startsWith('.')) continue; // Skip hidden files

      const docId = `nc-doc-${fileName}`;
      const name = fileName.replace(/\.txt$/i, '');
      const downloadUrl = href.startsWith('http') ? href : `${NC_URL}${href}`;

      // SMART SYNC: Check if we already have this doc with the same ETag
      const existingDoc = currentDocs.find(d => d.id === docId);

      if (existingDoc && existingDoc.etag === etag) {
        // CONTENT UNCHANGED: Reuse existing document
        docs.push(existingDoc);
        continue;
      }

      // CONTENT CHANGED or NEW: Download content
      try {
        const fileRes = await fetch(downloadUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });

        if (fileRes.ok) {
          const content = await fileRes.text();
          downloadCount++;
          
          docs.push({
            id: docId,
            name: name,
            category: determineCategory(name),
            uploadDate: new Date().toLocaleDateString('de-DE'), 
            content: content,
            status: 'aktiv',
            fileUrl: downloadUrl,
            etag: etag // Store ETag for next sync
          });
        }
      } catch (err) {
        console.error(`Failed to download ${fileName}`, err);
      }
    }

    if (downloadCount > 0) {
      console.log(`Nextcloud: Synced ${docs.length} documents. (${downloadCount} downloaded, ${docs.length - downloadCount} cached)`);
    }
    
    return docs;

  } catch (e) {
    console.error("Nextcloud Doc Sync Error:", e);
    // Return currentDocs to ensure we don't wipe the UI if the network fails
    return currentDocs;
  }
};
