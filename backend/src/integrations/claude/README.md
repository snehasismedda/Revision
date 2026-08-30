# 🧠 Claude MCP Integration for Revision

This module connects **Claude (Claude.ai / Claude Desktop)** directly to your Revision platform via the **Model Context Protocol (MCP)**.

With this connector, Claude can:
- 📖 **Read & search** your existing study notes, formulas, and key highlights.
- ✍️ **Create new study notes** with rich Markdown and LaTeX formatting.
- 🔄 **Update existing notes** (add extra derivations, formulas, or corrections).
- 🧮 **Solve exam questions & practice problems**, automatically saving the Question, Step-by-Step Solution, and Concept Theory into Revision.
- 📁 **Organize** content by subjects and topics.

---

## 🛠️ Setup Instructions

### 1. Configure API Key
In your [`backend/.env`](file:///Users/snehasismedda/Snehasis/Code/Projects/Revision/backend/.env), set an API key for Claude (or it will reuse `CHATGPT_API_KEY`):
```env
CLAUDE_API_KEY=rev_claude_c74ce9a665ac14feda84c46340f89af1
```

### 2. Start Your Backend & Tunnel
- Start backend:
  ```bash
  npm run dev
  ```
- Start ngrok tunnel (or use your deployed server URL):
  ```bash
  npm run tunnel
  ```

---

## 🌐 Connecting in Claude.ai (Remote MCP Connector)

1. Open **[Claude.ai](https://claude.ai)** -> Go to **Account / Settings** -> **Connectors** (or **Integrations**).
2. Click **Add Custom Connector**.
3. Fill in the connection details:
   - **Name**: `Revision Study Platform`
   - **Endpoint / URL**:
     ```text
     https://resume-zips-unfixable.ngrok-free.dev/api/integrations/claude/sse?token=rev_claude_c74ce9a665ac14feda84c46340f89af1
     ```
     *(Replace with your current ngrok URL or production domain)*
   - **Authentication**:
     - Header Name: `x-api-key`
     - Header Value: `rev_claude_c74ce9a665ac14feda84c46340f89af1`
     *(Or select Bearer Token if requested)*
4. Click **Connect / Save**.

---

## 🤖 Recommended Claude Project / Custom Instructions

When creating a Project or setting up Claude with this connector, paste the following instructions into Claude's System Prompt:

```text
You are an AI Study Assistant connected to the user's Revision Platform via MCP tools.

WORKFLOW RULES:
1. SUBJECT MATCHING:
   - Always call `list_subjects` first if you need the list of active subjects and their UUIDs.
   - Use the exact `subjectId` (or matching `subjectName`) for all operations.
   - If a subject does not exist, ask the user or call `create_subject` to create it.

2. NOTES & STUDYING:
   - To review or answer questions based on the user's material, call `list_notes` to locate relevant notes and `read_note` to retrieve the full theory and formulas.
   - When asked to create or summarize a note ("make a note", "save note"), format the note in clean Markdown with LaTeX math ($...$ or $$...$$) and call `create_note`.
   - When asked to edit, amend, or expand an existing note, call `update_note`.

3. SOLVING QUESTIONS & SAVING:
   - When the user shares an exam problem or practice question:
     1. Explain the concept and provide step-by-step calculations in the chat.
     2. When requested to save ("save solution", "save this problem"), call `save_question_and_solution` with:
        • questionText: The problem statement
        • solutionContent: Step-by-step derivation, calculations, and final answer
        • noteContent: Underlying theory and concept summary (optional)
        • tags: Array of keywords
```

---

## 🧰 Available MCP Tools

| Tool Name | Purpose | Parameters |
| :--- | :--- | :--- |
| `list_subjects` | Lists all active subjects and their IDs | *None* |
| `create_subject` | Creates a new subject | `name`, `description?`, `tags?` |
| `list_notes` | Lists notes metadata (title, tags, highlights) | `subjectId?`, `subjectName?`, `limit?` |
| `read_note` | Reads full note text, LaTeX equations, and tags | `title?`, `noteId?`, `subjectId?` |
| `create_note` | Creates a new note in Markdown & LaTeX | `subjectId?`, `subjectName?`, `title`, `content`, `tags?`, `keyHighlights?` |
| `update_note` | Updates existing note content or metadata | `noteId`, `title?`, `content?`, `tags?`, `keyHighlights?` |
| `save_question_and_solution` | Atomically saves Question, Solution & Theory Note | `subjectId?`, `subjectName?`, `questionText`, `solutionContent`, `noteContent?`, `tags?` |
| `list_questions` | Lists existing questions in a subject | `subjectId?`, `subjectName?`, `limit?` |

---

## 💡 Example Prompts You Can Try in Claude

- *"Show me what study notes I have under Physics in Revision."*
- *"Read my 'Carnot Engine' note and explain the second law derivation in simpler terms."*
- *"Add the coefficient of performance formula for refrigerators to my 'Carnot Engine' note."*
- *"Solve this 2nd-order ODE: $y'' + 4y' + 4y = 0$, $y(0)=1, y'(0)=0$, and save the solution and theory note under Differential Equations in Revision."*
