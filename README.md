# KnowledgeScout 

KnowledgeScout is a document-based Q&A platform that allows users to upload documents, embed their content for semantic search, and query them with precise answers referencing actual pages. It supports caching, private documents, and snippet-based responses.

---

## Features

- **Document Management**
  - Upload docs via `POST /api/docs` (supports multipart file uploads)
  - List docs with pagination: `GET /api/docs?limit=&offset=`
  - Retrieve individual docs: `GET /api/docs/:id`
- **Indexing**
  - Rebuild document index: `POST /api/index/rebuild`
  - Get index statistics: `GET /api/index/stats`
- **Q&A**
  - Ask questions with contextual answers: `POST /api/ask { query, k }`
  - Responses include snippets with page references
  - Query results cached for 60 seconds
- **Access Control**
  - Private documents visible only to owners or via share-token
  - Pagination support for docs list
  - Cached queries flagged

---

## Pages

- `/docs` — Upload and browse documents  
- `/ask` — Ask questions and get page-referenced answers  
- `/admin` — Manage system and index settings  

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/docs` | POST | Upload a document |
| `/api/docs` | GET | List documents with pagination (`limit`, `offset`) |
| `/api/docs/:id` | GET | Retrieve a document by ID |
| `/api/index/rebuild` | POST | Rebuild the document index |
| `/api/index/stats` | GET | Get index statistics |
| `/api/ask` | POST | Ask a question (`{ query, k }`) |

---

## Usage

### Upload a Document
```bash
curl -X POST "https://yourdomain.com/api/docs" \
  -F "file=@/path/to/document.pdf"
