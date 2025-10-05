
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const NodeCache = require('node-cache');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const app = express();
const cache = new NodeCache({ stdTTL: 60 }); // 60s cache

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI , {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const DocumentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  content: { type: String, required: true },
  pages: [{ pageNumber: Number, content: String }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPrivate: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  uploadedAt: { type: Date, default: Date.now },
  size: Number,
  mimeType: String
});

const QuerySchema = new mongoose.Schema({
  query: { type: String, required: true },
  answer: { type: String, required: true },
  references: [{ docId: String, docTitle: String, page: Number, snippet: String }],
  cachedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const IndexStatsSchema = new mongoose.Schema({
  totalDocuments: { type: Number, default: 0 },
  totalPages: { type: Number, default: 0 },
  lastRebuilt: { type: Date, default: Date.now },
  indexVersion: { type: Number, default: 1 }
});

const User = mongoose.model('User', UserSchema);
const Document = mongoose.model('Document', DocumentSchema);
const Query = mongoose.model('Query', QuerySchema);
const IndexStats = mongoose.model('IndexStats', IndexStatsSchema);

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

// Helper: Extract text content from file
const extractTextFromFile = (filepath, mimeType) => {
  const content = fs.readFileSync(filepath, 'utf8');
  
  // Simulate page extraction (split by newlines for demo)
  const lines = content.split('\n');
  const pages = [];
  const linesPerPage = 30;
  
  for (let i = 0; i < lines.length; i += linesPerPage) {
    const pageContent = lines.slice(i, i + linesPerPage).join('\n');
    if (pageContent.trim()) {
      pages.push({
        pageNumber: Math.floor(i / linesPerPage) + 1,
        content: pageContent
      });
    }
  }
  
  return { content, pages: pages.length > 0 ? pages : [{ pageNumber: 1, content }] };
};

// Helper: Simple search function
const searchDocuments = async (query, k = 5, userId = null) => {
  const queryLower = query.toLowerCase();
  let docs;
  
  if (userId) {
    docs = await Document.find({
      $or: [
        { owner: userId },
        { isPrivate: false }
      ]
    });
  } else {
    docs = await Document.find({ isPrivate: false });
  }
  
  const results = [];
  
  for (const doc of docs) {
    for (const page of doc.pages) {
      const contentLower = page.content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        const index = contentLower.indexOf(queryLower);
        const start = Math.max(0, index - 50);
        const end = Math.min(page.content.length, index + query.length + 50);
        const snippet = '...' + page.content.substring(start, end) + '...';
        
        results.push({
          docId: doc._id.toString(),
          docTitle: doc.title,
          page: page.pageNumber,
          snippet,
          relevance: (page.content.match(new RegExp(queryLower, 'gi')) || []).length
        });
      }
    }
  }
  
  results.sort((a, b) => b.relevance - a.relevance);
  return results.slice(0, k);
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ token, user: { id: user._id, username, email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Document Routes
app.post('/api/docs', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { title, isPrivate } = req.body;
    const { content, pages } = extractTextFromFile(req.file.path, req.file.mimetype);
    
    const doc = new Document({
      title: title || req.file.originalname,
      filename: req.file.originalname,
      filepath: req.file.path,
      content,
      pages,
      owner: req.user.id,
      isPrivate: isPrivate === 'true',
      shareToken: isPrivate === 'true' ? crypto.randomBytes(16).toString('hex') : null,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
    
    await doc.save();
    
    // Update index stats
    const stats = await IndexStats.findOne() || new IndexStats();
    stats.totalDocuments = await Document.countDocuments();
    stats.totalPages = (await Document.aggregate([
      { $unwind: '$pages' },
      { $count: 'total' }
    ]))[0]?.total || 0;
    await stats.save();
    
    res.status(201).json({
      id: doc._id,
      title: doc.title,
      filename: doc.filename,
      isPrivate: doc.isPrivate,
      shareToken: doc.shareToken,
      uploadedAt: doc.uploadedAt,
      pageCount: doc.pages.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docs', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    let query = {};
    
    if (req.user) {
      query = {
        $or: [
          { owner: req.user.id },
          { isPrivate: false }
        ]
      };
    } else {
      query = { isPrivate: false };
    }
    
    const docs = await Document.find(query)
      .select('title filename uploadedAt size isPrivate owner pages')
      .skip(offset)
      .limit(limit)
      .sort({ uploadedAt: -1 });
    
    const total = await Document.countDocuments(query);
    
    res.json({
      documents: docs.map(doc => ({
        id: doc._id,
        title: doc.title,
        filename: doc.filename,
        uploadedAt: doc.uploadedAt,
        size: doc.size,
        isPrivate: doc.isPrivate,
        pageCount: doc.pages.length,
        isOwner: req.user && doc.owner.toString() === req.user.id
      })),
      total,
      limit,
      offset
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docs/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check access rights
    const shareToken = req.query.shareToken;
    const canAccess = !doc.isPrivate || 
                     (req.user && doc.owner.toString() === req.user.id) ||
                     (shareToken && doc.shareToken === shareToken);
    
    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      id: doc._id,
      title: doc.title,
      filename: doc.filename,
      content: doc.content,
      pages: doc.pages,
      uploadedAt: doc.uploadedAt,
      size: doc.size,
      isPrivate: doc.isPrivate,
      shareToken: req.user && doc.owner.toString() === req.user.id ? doc.shareToken : undefined
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Index Routes
app.post('/api/index/rebuild', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const stats = await IndexStats.findOne() || new IndexStats();
    stats.totalDocuments = await Document.countDocuments();
    stats.totalPages = (await Document.aggregate([
      { $unwind: '$pages' },
      { $count: 'total' }
    ]))[0]?.total || 0;
    stats.lastRebuilt = new Date();
    stats.indexVersion += 1;
    await stats.save();
    
    // Clear query cache
    cache.flushAll();
    await Query.deleteMany({});
    
    res.json({
      message: 'Index rebuilt successfully',
      stats: {
        totalDocuments: stats.totalDocuments,
        totalPages: stats.totalPages,
        lastRebuilt: stats.lastRebuilt,
        indexVersion: stats.indexVersion
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/index/stats', async (req, res) => {
  try {
    let stats = await IndexStats.findOne();
    
    if (!stats) {
      stats = new IndexStats({
        totalDocuments: await Document.countDocuments(),
        totalPages: (await Document.aggregate([
          { $unwind: '$pages' },
          { $count: 'total' }
        ]))[0]?.total || 0
      });
      await stats.save();
    }
    
    res.json({
      totalDocuments: stats.totalDocuments,
      totalPages: stats.totalPages,
      lastRebuilt: stats.lastRebuilt,
      indexVersion: stats.indexVersion
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Query Route
app.post('/api/ask', authenticateToken, async (req, res) => {
  try {
    const { query, k = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Check cache
    const cacheKey = `query:${query}:${k}:${req.user?.id || 'public'}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({ ...cached, cached: true });
    }
    
    // Check database cache
    const dbCached = await Query.findOne({
      query,
      expiresAt: { $gt: new Date() }
    });
    
    if (dbCached) {
      cache.set(cacheKey, {
        query: dbCached.query,
        answer: dbCached.answer,
        references: dbCached.references
      });
      return res.json({
        query: dbCached.query,
        answer: dbCached.answer,
        references: dbCached.references,
        cached: true
      });
    }
    
    // Perform search
    const references = await searchDocuments(query, parseInt(k), req.user?.id);
    
    // Generate answer
    const answer = references.length > 0
      ? `Found ${references.length} relevant reference(s) across ${new Set(references.map(r => r.docId)).size} document(s). The query "${query}" appears in the following contexts.`
      : `No relevant documents found for the query "${query}".`;
    
    const response = { query, answer, references };
    
    // Cache result
    cache.set(cacheKey, response);
    
    const queryDoc = new Query({
      query,
      answer,
      references,
      expiresAt: new Date(Date.now() + 60000) // 60s
    });
    await queryDoc.save();
    
    res.json({ ...response, cached: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`KnowledgeScout server running on port ${PORT}`);
});