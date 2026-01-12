
# Nextcloud FAQ Bot: Architecture & Process Guide

This document outlines the optional backend architecture for integrating **Nextcloud** as the central storage and management system for the Wohnpro Guide.

## 1. Project Goal
The primary goal of this integration is to automate the knowledge ingestion process for the AI-based FAQ Bot.

Instead of manually typing data into the bot or managing complex databases, this system allows administrators to simply drag and drop standard business documents (PDFs, Word Docs) into a cloud folder. The system automatically transforms these documents into a format the bot can understand (plain text), ensuring the FAQ bot is always up-to-date with the latest company policies, price lists, and manuals.

---

## 2. Nextcloud Configuration
To facilitate this automation, the Nextcloud instance is configured to act as both the **Trigger** (notifying the system of changes) and the **Storage** (holding both original and processed files).

### A. Folder Structure
To prevent infinite processing loops and maintain organization, we use a strictly separated folder structure:

**Root Folder:** `FAQ-Bot-Project`

*   **📂 01-Upload-Here (Source)**
    *   **Purpose:** This is the "Human Zone."
    *   **Action:** Users upload, update, or delete PDF/DOCX files here.
    *   **Webhook:** This folder is monitored by the system.

*   **📂 02-Bot-Memory (Destination)**
    *   **Purpose:** This is the "Machine Zone."
    *   **Action:** The Node.js application saves the extracted `.txt` files here.
    *   **Bot Access:** The FAQ Bot reads strictly from this folder to answer questions.

*   **📂 99-Admin (Configuration)**
    *   **Purpose:** User management.
    *   **Content:** Contains `users.csv`.

### B. Access & Security (WebDAV)
The Node.js application connects to Nextcloud via the **WebDAV** protocol.

*   **URL:** `https://your-instance.com/remote.php/dav/files/USERNAME/`
*   **Authentication:** We use a dedicated **App Password** (generated in Security Settings > Devices & Sessions).
*   **Security Note:** The main user password is never used. This allows us to revoke the bot's access instantly without affecting the administrator's account.

### C. The Webhook (The Trigger)
The "Webhooks" app (or Flow app) is installed in Nextcloud.

*   **Rule:** When a file is **Created** or **Updated** in `01-Upload-Here`...
*   **Action:** Send a POST request to the Node.js application URL.
*   **Payload:** Sends the file path and filename to the application.

---

## 3. File Processing Logic (The Node.js Application)
The Node.js application acts as the "Translator" between the human documents and the AI bot.

### The Logic Flow
1.  **Listen:** The app sits idle, listening for a signal from the Nextcloud Webhook.
2.  **Verify:** When a signal arrives, the app checks:
    *   Did this come from `01-Upload-Here`? (Security check)
    *   Is it a PDF or DOCX? (File type check)
3.  **Download:** It uses WebDAV to download the raw file into memory (Buffer).
4.  **Extract:**
    *   **If PDF:** Uses `pdf-parse` to strip formatting and grab raw text.
    *   **If DOCX:** Uses `mammoth` to extract raw text.
5.  **Clean:** (Optional) Removes excess whitespace or unreadable characters.
6.  **Upload:** It connects back to Nextcloud via WebDAV and creates a new file in `02-Bot-Memory`.
    *   *Example:* `policy.pdf` becomes `policy.txt`.

---

## 4. The Data Lifecycle
This section describes the journey of a single piece of information—for example, a new "2024 Holiday Policy."

| Stage | Actor | Action | State of Data |
| :--- | :--- | :--- | :--- |
| **1. Ingestion** | Human Admin | Drags `Holiday-2024.pdf` into the `01-Upload-Here` folder. | **Raw Document**<br>(Complex, formatted, hard for bots to read) |
| **2. Notification** | Nextcloud | Detects the new file and instantly "pings" the Node.js server. | **Signal**<br>("Hey, new data at /path/to/file!") |
| **3. Translation** | Node.js App | Downloads the PDF, reads it, and strips away images/logos, keeping only the words. | **Extracted Text**<br>(Clean, simple, machine-readable) |
| **4. Storage** | Node.js App | Saves the text as `Holiday-2024.txt` into the `02-Bot-Memory` folder. | **Knowledge Asset**<br>(Ready for the AI) |
| **5. Retrieval** | FAQ Bot | When a user asks "What are the holiday rules?", the bot reads `Holiday-2024.txt` to generate the answer. | **Answer**<br>(User receives accurate info) |

---

## 5. Maintenance & Troubleshooting
*   **Updating Info:** Simply overwrite the file in `01-Upload-Here`. The process runs again and overwrites the text file in `02-Bot-Memory`.
*   **Deleting Info:** If you delete a file in `01-Upload-Here`, the bot will technically still have the `.txt` version.
    *   *Advanced Feature:* We can configure the webhook to listen for "File Deleted" events to automatically remove the corresponding `.txt` file.
*   **Monitoring:** If the bot answers incorrectly, check the `02-Bot-Memory` folder. Open the text file to ensure the text was extracted correctly (e.g., ensuring scanned PDFs were read correctly).

---

## 6. User Management via CSV
For managing access to the Wohnpro Guide without a database, we use a CSV file located in the `99-Admin` folder.

### The Process
1.  Admin edits `users.csv` in Nextcloud (using the built-in Text Editor or uploading a new version).
2.  Webhook triggers on update of `99-Admin/users.csv`.
3.  Node.js App downloads the CSV, parses it, and updates the application's user whitelist.

### CSV Format
```csv
email,role,status
admin@wohnpro.de,ADMIN,aktiv
new@wohnpro.de,USER,eingeladen
old@wohnpro.de,USER,deaktiviert
```

---

## 7. Required Environment Variables
To enable this integration, the Node.js application requires the following configuration:

```bash
NEXTCLOUD_URL=https://cloud.your-domain.com
NEXTCLOUD_USER=bot-account
NEXTCLOUD_PASSWORD=xxxx-xxxx-xxxx-xxxx # App Password
NEXTCLOUD_ROOT_FOLDER=FAQ-Bot-Project
WEBHOOK_SECRET=your-secret-token-for-verification
```
