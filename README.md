
# Wohnpro Guide

Der zentrale Wissens- und Orientierungsort für gemeinschaftliches Wohnen. Ein KI-gestützter Guide für Hausordnungen, Verträge und Beschlüsse.

## 🚀 Local Setup

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Configuration Options

You can configure the application to use either **Google AI Studio** (Recommended for quick start) or **Google Cloud Vertex AI** (Recommended for enterprise).

#### Option A: Google AI Studio (API Key)
1.  Create a `.env` file in the root directory.
2.  Add your API Key.
    ```bash
    # .env
    API_KEY=AIzaSyYourKeyHere...
    ```
3.  To obtain an API key, visit [Google AI Studio](https://aistudio.google.com/).

#### Option B: Google Cloud Vertex AI
1.  Ensure you have a Google Cloud Project with the Vertex AI API enabled.
2.  Configure your `.env` file with the following variables instead of (or in addition to) the API Key:
    ```bash
    # .env
    GCP_PROJECT=your-gcp-project-id
    GCP_LOCATION=us-central1
    ```
    *Note: If running in a browser environment without a proxy, you may still need to handle authentication (e.g., OAuth tokens) depending on your network setup.*

#### Option C: Nextcloud Backend (Enterprise)
For production environments where document management and user administration should be handled externally via Nextcloud:
👉 **[Read the Nextcloud Integration Guide](NEXTCLOUD_INTEGRATION.md)**

This setup allows:
*   Document management via Nextcloud folders (drag & drop).
*   Automatic PDF/DOCX to Text conversion via Webhooks.
*   User management via a `users.csv` file.

### ⚙️ Configuration Reference

The application can be configured using environment variables (e.g., in a `.env` file).

| Variable | Description | Required For |
| :--- | :--- | :--- |
| `API_KEY` | Google Gemini API Key. | **Standard Mode** |
| `GCP_PROJECT` | Google Cloud Project ID. | Vertex AI Mode |
| `GCP_LOCATION` | Google Cloud Region (e.g. `us-central1`). | Vertex AI Mode |
| `NEXTCLOUD_URL` | Base URL of your Nextcloud instance (e.g. `https://cloud.example.com`). | **Nextcloud Mode** |
| `NEXTCLOUD_USER` | Username or Bot Account name for WebDAV access. | **Nextcloud Mode** |
| `NEXTCLOUD_PASSWORD` | App Password for the user (Generated in Nextcloud Security Settings). | **Nextcloud Mode** |
| `NEXTCLOUD_ROOT_FOLDER` | The root folder name where `02-Bot-Memory` resides. Default: `FAQ-Bot-Project`. | **Nextcloud Mode** |
| `WEBHOOK_SECRET` | Secret token to verify webhook requests in the backend. | **Backend Server** |

### Running the App

```bash
npm start
# or depending on your build tool (e.g., Vite)
npm run dev
```

The application will launch at `http://localhost:3000`.

### Running the Backend Middleware (Optional)
To enable automatic document conversion via Nextcloud Webhooks, run the Node.js middleware:

1.  Ensure you have installed backend dependencies: `npm install express webdav mammoth pdf-parse`.
2.  Run the server:
    ```bash
    ts-node backend/server.ts
    ```
    (Or compile TS to JS and run with node).
3.  Configure your Nextcloud Webhook to point to `http://YOUR_SERVER_IP:3001/nextcloud-webhook?secret=YOUR_SECRET`.

---

## 🤖 Models & Capabilities

This project uses the `@google/genai` SDK to access specific Gemini models.

### 1. Text & RAG
*   **Model**: `gemini-3-flash-preview`
*   **Purpose**: Used for the main chat interface, generating FAQs from documents, and verifying user invitations.

### 2. Speech-to-Text (STT) & Text-to-Speech (TTS)
*   **Model**: `gemini-2.5-flash-native-audio-preview-12-2025`
*   **Purpose**: The "Voice Mode" uses the **Multimodal Live API**.
*   **How it works**: We do **not** use separate STT (Transcription) or TTS (Synthesis) models. Instead, we open a bidirectional WebSocket connection to the model. We stream raw audio bytes in, and the model streams raw audio bytes out. This provides much lower latency than traditional STT -> LLM -> TTS pipelines.

---

## 💾 Database Structure

Currently, this application uses the browser's `localStorage` for persistence. For a production deployment, use a backend database (e.g., PostgreSQL).

| Table | Description |
| :--- | :--- |
| `users` | Stores authentication and authorization details (`role`: USER/ADMIN). |
| `documents` | Stores extracted text content for RAG. **Critical**: The `content` column holds the full text used for AI context. |
| `personas` | Defines target audiences for dynamic FAQ generation. Contains the "Meta-Prompt". |
| `faqs` | Stores pre-generated questions and answers linked to `documents` and `personas`. |
| `chat_sessions` | Stores conversation history. |
