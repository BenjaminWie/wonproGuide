
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

### Configuration

1.  Create a `.env` file in the root directory.
2.  Add your Google Gemini API Key (see `.env.example`).

```bash
# .env
API_KEY=AIzaSyYourKeyHere...
```

To obtain an API key, visit [Google AI Studio](https://aistudio.google.com/).

### Running the App

```bash
npm start
# or depending on your build tool (e.g., Vite)
npm run dev
```

The application will launch at `http://localhost:3000` (or the port specified by your bundler).

---

## 💾 Database Structure

Currently, this application uses the browser's `localStorage` for persistence. For a production deployment, you should implement a backend database (e.g., PostgreSQL or MongoDB) with the following schema structure.

### 1. Users (`users`)
Stores authentication and authorization details for residents and admins.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / String | Primary Key. |
| `email` | String | Unique email address. |
| `role` | Enum | `'USER'` (Resident) or `'ADMIN'` (Admin). |
| `status` | Enum | `'aktiv'`, `'eingeladen'`, `'deaktiviert'`. |
| `invited_at` | Timestamp | Date of invitation. |
| `invite_content` | Text | (Optional) AI-generated personalized invite message. |

### 2. Documents (`documents`)
Stores the knowledge base (PDFs/DOCX converted to text) used for RAG (Retrieval-Augmented Generation).

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / String | Primary Key. |
| `name` | String | Original filename. |
| `category` | Enum | e.g., 'Recht & Struktur', 'Hausordnung'. |
| `content` | Text / Blob | **Critical**: The full extracted text content for AI analysis. |
| `upload_date` | Date | |
| `status` | Enum | `'aktiv'` or `'archiviert'`. |

### 3. Personas (`personas`)
Defines the "lenses" or target audiences for dynamic FAQ generation.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / String | Primary Key. |
| `name` | String | Display name (e.g., "The Newcomer"). |
| `description` | Text | **Meta-Dynamic Prompt**: Instructions for the AI on how to think/ask questions like this persona. |
| `role` | Enum | `'beginner'` or `'expert'` (Controls UI styling). |

### 4. FAQs (`faqs`)
Stores AI-generated questions and answers derived from documents, specific to a persona.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID / String | Primary Key. |
| `question` | String | The generated question. |
| `answer` | Text | The generated answer. |
| `category` | String | Matches document category. |
| `source_doc_id` | UUID | Foreign Key -> `documents.id`. |
| `persona_id` | UUID | Foreign Key -> `personas.id`. |

### 5. Chat Sessions (`chat_sessions`)
(Optional) Stores chat history for users.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key. |
| `user_id` | UUID | Foreign Key -> `users.id`. |
| `messages` | JSONB | Array of `{ role: 'user'|'model', text: '...', citations: [...] }`. |

---

## 🔑 Vertex AI / Gemini API Configuration

This project uses the `@google/genai` SDK.

**Requirements:**
1.  **Google Cloud Project** or **Google AI Studio** account.
2.  **API Key**: Must have permissions for `gemini-2.5-flash` and `gemini-3-flash-preview` models.

**Example `.env`:**

```env
# The API key must start with AIza...
# Ensure this key is not committed to public repositories.
API_KEY=AIzaSyD-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Code Usage:**
The app initializes the client strictly using the environment variable:
```typescript
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```
