
import { Document, User, Role, UserStatus, Category, Milestone } from '../types';
import * as XLSX from 'xlsx';

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

export const fetchNextcloudUsers = async (): Promise<User[]> => {
  if (!isNextcloudConfigured()) return [];

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

    const startRow = lines[0].toLowerCase().includes('email') ? 1 : 0;

    for (let i = startRow; i < lines.length; i++) {
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
    return users;

  } catch (e) {
    console.error("Nextcloud User Sync Error:", e);
    return [];
  }
};

export const fetchNextcloudTimeline = async (): Promise<Milestone[]> => {
  if (!isNextcloudConfigured()) return [];

  const excelUrl = `${NC_URL}/remote.php/dav/files/${NC_USER}/${NC_ROOT}/99-Admin/timeline.xlsx`;

  try {
    const response = await fetch(excelUrl, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) return [];

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    const milestones: Milestone[] = jsonData.map((row: any, index) => {
      // Excel Dates are numbers, XLSX util handles conversion but good to be safe with strings if user formatted as text
      let startDate = row['Startdatum'] || row['Start'] || new Date().toISOString();
      let endDate = row['Enddatum'] || row['Ende'] || new Date().toISOString();

      // Simple handling if XLSX returns JS Date objects directly
      if (startDate instanceof Date) startDate = startDate.toISOString().split('T')[0];
      if (endDate instanceof Date) endDate = endDate.toISOString().split('T')[0];

      return {
        id: `nc-milestone-${index}`,
        title: row['Titel'] || row['Aufgabe'] || 'Unbenannt',
        startDate,
        endDate,
        owner: row['Verantwortlich'] || row['Owner'] || 'Team',
        progress: parseInt(row['Fortschritt'] || row['Progress'] || '0'),
        status: (row['Status']?.toLowerCase() as any) || 'planned',
        description: row['Beschreibung'] || row['Description'] || '',
      };
    });

    console.log(`Nextcloud: Synced ${milestones.length} milestones.`);
    return milestones;

  } catch (e) {
    console.error("Nextcloud Timeline Sync Error:", e);
    return [];
  }
};

export const fetchNextcloudDocuments = async (currentDocs: Document[] = []): Promise<Document[]> => {
  if (!isNextcloudConfigured()) return [];

  const folderUrl = `${NC_URL}/remote.php/dav/files/${NC_USER}/${NC_ROOT}/02-Bot-Memory/`;

  try {
    const response = await fetch(folderUrl, {
      method: 'PROPFIND',
      headers: {
        ...getAuthHeaders(),
        'Depth': '1', 
        'Content-Type': 'application/xml'
      },
      body: `<?xml version="1.0"?>
        <d:propfind  xmlns:d="DAV:">
          <d:prop>
            <d:getlastmodified/>
            <d:getetag/>
            <d:resourcetype/>
          </d:prop>
        </d:propfind>`
    });

    if (!response.ok) return currentDocs;

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const responses = xmlDoc.getElementsByTagNameNS("*", "response");
    const docs: Document[] = [];

    for (let i = 0; i < responses.length; i++) {
      const resp = responses[i];
      const hrefNode = resp.getElementsByTagNameNS("*", "href")[0];
      const propNode = resp.getElementsByTagNameNS("*", "prop")[0];
      
      let href = hrefNode?.textContent;
      if (!href) continue;
      
      href = decodeURIComponent(href);

      if (!href.endsWith('.txt')) continue;

      const resType = propNode?.getElementsByTagNameNS("*", "resourcetype")[0];
      if (resType && resType.getElementsByTagNameNS("*", "collection").length > 0) continue;

      let etag = propNode?.getElementsByTagNameNS("*", "getetag")[0]?.textContent || '';
      etag = etag.replace(/^["']|["']$/g, '');

      const fileName = href.split('/').pop() || 'unknown';
      if (fileName.startsWith('.')) continue;

      const docId = `nc-doc-${fileName}`;
      const name = fileName.replace(/\.txt$/i, '');
      const downloadUrl = href.startsWith('http') ? href : `${NC_URL}${href}`;

      const existingDoc = currentDocs.find(d => d.id === docId);

      if (existingDoc && existingDoc.etag === etag) {
        docs.push(existingDoc);
        continue;
      }

      try {
        const fileRes = await fetch(downloadUrl, {
          method: 'GET',
          headers: getAuthHeaders()
        });

        if (fileRes.ok) {
          const content = await fileRes.text();
          docs.push({
            id: docId,
            name: name,
            category: 'Allgemein', // Categories are managed by App.tsx AI logic or defaults
            uploadDate: new Date().toLocaleDateString('de-DE'), 
            content: content,
            status: 'aktiv',
            fileUrl: downloadUrl,
            etag: etag
          });
        }
      } catch (err) {
        console.error(`Failed to download ${fileName}`, err);
      }
    }
    
    return docs;

  } catch (e) {
    console.error("Nextcloud Doc Sync Error:", e);
    return currentDocs;
  }
};
