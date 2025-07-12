import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8788;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database for demo
let spores = [];
let nextId = 1;

// Initialize with some demo data
async function initializeDemoData() {
  const demoSpores = [
    {
      id: nextId++,
      lat: -33.9249,
      lng: 18.4241,
      message: "Beautiful oyster mushrooms found in Kirstenbosch!",
      cookie_id: "demo_user_1",
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: nextId++,
      lat: -33.9189,
      lng: 18.4180,
      message: "Spotted some porcini near the Company's Garden",
      cookie_id: "demo_user_2",
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    },
    {
      id: nextId++,
      lat: -33.9321,
      lng: 18.4602,
      message: "Found edible mushrooms after the rain in Camps Bay",
      cookie_id: "demo_user_3",
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: nextId++,
      lat: -33.9144,
      lng: 18.3758,
      message: "Fairy ring mushrooms on Signal Hill trail",
      cookie_id: "demo_user_4",
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
    {
      id: nextId++,
      lat: -33.9423,
      lng: 18.4085,
      message: "Chanterelles growing near Newlands Forest!",
      cookie_id: "demo_user_5",
      created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    }
  ];
  
  spores.push(...demoSpores);
}

// Rate limiting mock
const rateLimitMap = new Map();

function checkRateLimit(cookieId) {
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);
  
  let timestamps = rateLimitMap.get(cookieId) || [];
  timestamps = timestamps.filter(ts => ts > hourAgo);
  
  if (timestamps.length >= 5) {
    return false;
  }
  
  timestamps.push(now);
  rateLimitMap.set(cookieId, timestamps);
  return true;
}

// GET /api/spores
app.get('/api/spores', (req, res) => {
  const { minLat, maxLat, minLng, maxLng, cursor, limit } = req.query;
  
  let filteredSpores = [...spores];
  
  // Apply bounding box filter
  if (minLat) filteredSpores = filteredSpores.filter(s => s.lat >= parseFloat(minLat));
  if (maxLat) filteredSpores = filteredSpores.filter(s => s.lat <= parseFloat(maxLat));
  if (minLng) filteredSpores = filteredSpores.filter(s => s.lng >= parseFloat(minLng));
  if (maxLng) filteredSpores = filteredSpores.filter(s => s.lng <= parseFloat(maxLng));
  
  // Apply cursor
  if (cursor) {
    const cursorId = parseInt(cursor);
    filteredSpores = filteredSpores.filter(s => s.id > cursorId);
  }
  
  // Sort by ID
  filteredSpores.sort((a, b) => a.id - b.id);
  
  // Apply limit
  const parsedLimit = limit ? parseInt(limit) : undefined;
  if (parsedLimit && parsedLimit > 0) {
    filteredSpores = filteredSpores.slice(0, parsedLimit);
  }
  
  const nextCursor = filteredSpores.length > 0 && parsedLimit && filteredSpores.length === parsedLimit
    ? filteredSpores[filteredSpores.length - 1].id
    : null;
  
  res.json({
    spores: filteredSpores,
    total: spores.length,
    pagination: {
      cursor: cursor ? parseInt(cursor) : null,
      nextCursor,
      limit: parsedLimit || null,
      hasMore: nextCursor !== null
    }
  });
});

// POST /api/spores
app.post('/api/spores', (req, res) => {
  const { lat, lng, message, cookie_id } = req.body;
  
  // Validation
  if (typeof lat !== 'number' || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Invalid latitude' });
  }
  
  if (typeof lng !== 'number' || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Invalid longitude' });
  }
  
  if (!message || typeof message !== 'string' || message.length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  if (message.length > 280) {
    return res.status(400).json({ error: 'Message must be 280 characters or less' });
  }
  
  if (!cookie_id) {
    return res.status(400).json({ error: 'Cookie ID is required' });
  }
  
  // Rate limiting
  if (!checkRateLimit(cookie_id)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded. You can only create 5 spores per hour.' 
    });
  }
  
  // Create spore
  const newSpore = {
    id: nextId++,
    lat,
    lng,
    message,
    cookie_id,
    created_at: new Date().toISOString(),
    ip_address: req.ip || 'unknown'
  };
  
  spores.push(newSpore);
  
  res.status(201).json({
    success: true,
    id: newSpore.id,
    message: 'Spore created successfully'
  });
});

// OPTIONS for CORS
app.options('/api/spores', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.send();
});

// Start server
app.listen(PORT, async () => {
  await initializeDemoData();
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log(`Initialized with ${spores.length} demo spores`);
  console.log('\nEndpoints:');
  console.log('  GET  /api/spores - List spores');
  console.log('  POST /api/spores - Create a spore');
});