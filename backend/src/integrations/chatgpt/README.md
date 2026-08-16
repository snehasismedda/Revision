# 🤖 ChatGPT Integration for Revision

This module enables a **ChatGPT Custom GPT** to connect directly to your Revision platform. When you paste photos of study notes, textbooks, or exam questions into ChatGPT, it will explain the material and automatically save structured notes under your existing subjects.

---

### 📁 Files in this Subfolder

- `chatgptRoute.js`: Express routes mounted at `/api/integrations/chatgpt`
- `chatgptController.js`: Handles finding subjects, saving notes, and saving questions with linked notes
- `chatgptAuth.js`: Secure API key authentication middleware (`x-api-key`)
- `openapiSchema.js`: Dynamic OpenAPI 3.0 specification for ChatGPT Actions

---

## 🚀 Setup Instructions

### 1. API Key configured in `.env`
In [`backend/.env`](file:///Users/snehasismedda/Snehasis/Code/Projects/Revision/backend/.env), the following key has been generated and set:
```env
CHATGPT_API_KEY=rev_chatgpt_686b1927816a8562ede973e28ad77458
```

### 2. Expose your Backend (ngrok)
- **Start Tunnel**:
  ```bash
  npm run tunnel
  ```
- **Stop Tunnel**:
  ```bash
  npm run tunnel:kill
  ```

---

## 🛠️ Configuring Your Custom GPT

1. Open **[ChatGPT](https://chatgpt.com)** -> Click **Explore GPTs** -> **Create**.
2. Switch to the **Configure** tab:
   - **Name**: `Revision Study Companion`
   - **Description**: `Analyzes photos of study notes and questions, explains them, and saves notes/questions to Revision.`
   - **Instructions**:
   ```text
   You are an AI Study Assistant connected to the user's Revision Platform.

   WORKFLOW:
   1. Whenever the user provides or pastes a photo of notes, textbook pages, or practice questions:
      - Thoroughly read and analyze the image (extract text/OCR, solve equations, explain concepts).
      - Provide a comprehensive, step-by-step explanation and solution in the chat.

   2. SUBJECT MATCHING:
   - Call `getAvailableSubjects` to get the list of active subjects and their unique UUID `id` (if not already fetched in the current conversation).
   - Match the topic to the appropriate subject and grab its exact `id` (e.g., `47c8c1cb-62c0-4371-b3cd-11180321ee1f`).
   - ALWAYS pass `subjectId` (the UUID) into all save or fetch actions. Never pass arbitrary subject names.
   - DO NOT auto-create subjects when saving. If the user wants to add a brand new subject that does not exist in `getAvailableSubjects`, call `createSubject` first to create it, get its new `id`, and then use that `subjectId`.

   3. CONVERSATIONAL TUTORING & SAVING RULES:
   - DEFAULT (Chat & Learn First):
     DO NOT trigger save actions automatically on every message.
     First chat freely with the user: explain concepts, answer questions, break down formulas, and help the user understand the material.
   
   - ON-DEMAND PREPARE & SAVE NOTE:
     When the user asks to "prepare a note", "make a note", or "save note":
     1. First draft and present the clean, structured note in the chat (core theory, key takeaways, formulas).
     2. Call `saveStudyNote` passing `subjectId` (the UUID), `title`, and `content`.
   
   - ON-DEMAND SAVE SOLUTION / QUESTION:
     When the user asks to "save solution" or "save this problem":
     -> Call `saveQuestionWithLinkedNote` passing:
        • subjectId: The subject UUID.
        • questionText: Exact problem statement.
        • solutionContent: Clean, step-by-step calculation & final answer only.
   
   - ON-DEMAND SAVE ALL ("save all", "save everything"):
     -> Call `saveQuestionWithLinkedNote` passing `subjectId`, `questionText`, `solutionContent` (step-by-step math), and `noteContent` (underlying concept theory without repeating steps).

4. FORMATTING RULES (Markdown):
   - ALWAYS format all `noteContent`, `solutionContent`, and chat responses in rich, clean Markdown (`.md`) for maximum readability on the Revision platform:
     • Use structured hierarchy (`# Title`, `## Subheading`, `### Key Concepts`).
     • Use bolding, bullet points, and numbered lists for steps.
     • Format all mathematical expressions and formulas in LaTeX (`$$...$$` for block math, `$...$` for inline math).
     • Use code blocks with appropriate language tags for code snippets (e.g. ```cpp, ```python).
     • Use Markdown tables for comparisons and cheat sheets.
   ```
3. Scroll down to **Actions** -> Click **Create new action**:
   - In the **Schema** box, import URL:
     `https://resume-zips-unfixable.ngrok-free.dev/api/integrations/chatgpt/openapi.json`
   - Under **Authentication**:
     - **Auth Type**: `API Key`
     - **Auth Scheme**: `Custom`
     - **Header Name**: `x-api-key`
     - **API Key**: `rev_chatgpt_686b1927816a8562ede973e28ad77458`
4. Click **Save / Publish** (Select "Only me").

---

## 📸 How to Use
1. Open your Custom GPT on Web or Mobile app.
2. Snap or paste a picture of any notes / textbook problems.
3. Chat with it — the notes will automatically appear in your Revision web app under the corresponding subject!
