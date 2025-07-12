import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DB: D1Database;
  RATE_LIMITER: KVNamespace;
}

interface SporeData {
  lat: number;
  lng: number;
  message: string;
  cookie_id: string;
}

interface SporeRecord extends SporeData {
  id: number;
  created_at: string;
  ip_address?: string;
}

interface CountResult {
  total: number;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

async function checkRateLimit(env: Env, cookieId: string): Promise<boolean> {
  const key = `rate_limit:${cookieId}`;
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000); // 1 hour ago
  
  const data = await env.RATE_LIMITER.get(key);
  let timestamps: number[] = [];
  
  if (data) {
    timestamps = JSON.parse(data);
    // Filter out timestamps older than 1 hour
    timestamps = timestamps.filter(ts => ts > hourAgo);
  }
  
  // Check if user has exceeded limit (5 spores per hour)
  if (timestamps.length >= 5) {
    return false;
  }
  
  // Add current timestamp and store back
  timestamps.push(now);
  await env.RATE_LIMITER.put(key, JSON.stringify(timestamps), {
    expirationTtl: 3600 // 1 hour
  });
  
  return true;
}

function validateSporeData(data: unknown): { valid: boolean; error?: string; sporeData?: SporeData } {
  if (!data) {
    return { valid: false, error: 'Request body is required' };
  }
  
  const { lat, lng, message, cookie_id } = data;
  
  if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
    return { valid: false, error: 'Invalid latitude: must be a number between -90 and 90' };
  }
  
  if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: 'Invalid longitude: must be a number between -180 and 180' };
  }
  
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }
  
  if (message.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (message.length > 280) {
    return { valid: false, error: 'Message must be 280 characters or less' };
  }
  
  if (typeof cookie_id !== 'string' || cookie_id.length === 0) {
    return { valid: false, error: 'Cookie ID is required' };
  }
  
  return {
    valid: true,
    sporeData: { lat, lng, message, cookie_id }
  };
}

app.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const validation = validateSporeData(data);
    
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }
    
    const sporeData = validation.sporeData!;
    
    // Check rate limit
    const rateLimitOk = await checkRateLimit(c.env, sporeData.cookie_id);
    if (!rateLimitOk) {
      return c.json({ 
        error: 'Rate limit exceeded. You can only create 5 spores per hour.' 
      }, 429);
    }
    
    // Get client IP address
    const clientIP = c.req.header('CF-Connecting-IP') || 
                    c.req.header('X-Forwarded-For') || 
                    'unknown';
    
    // Insert into database
    const result = await c.env.DB.prepare(`
      INSERT INTO spores (lat, lng, message, cookie_id, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      sporeData.lat,
      sporeData.lng,
      sporeData.message,
      sporeData.cookie_id,
      clientIP
    ).run();
    
    if (!result.success) {
      console.error('Database insert failed:', result.error);
      return c.json({ error: 'Failed to create spore' }, 500);
    }
    
    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: 'Spore created successfully'
    }, 201);
    
  } catch (error) {
    console.error('Error creating spore:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/', async (c) => {
  try {
    // Parse query parameters
    const { minLat, maxLat, minLng, maxLng, cursor, limit } = c.req.query();
    
    let query = 'SELECT id, lat, lng, message, cookie_id, created_at FROM spores';
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    
    // Add bounding box filtering if provided
    if (minLat !== undefined) {
      conditions.push('lat >= ?');
      params.push(parseFloat(minLat));
    }
    
    if (maxLat !== undefined) {
      conditions.push('lat <= ?');
      params.push(parseFloat(maxLat));
    }
    
    if (minLng !== undefined) {
      conditions.push('lng >= ?');
      params.push(parseFloat(minLng));
    }
    
    if (maxLng !== undefined) {
      conditions.push('lng <= ?');
      params.push(parseFloat(maxLng));
    }
    
    // Add cursor-based pagination if provided
    if (cursor !== undefined) {
      conditions.push('id > ?');
      params.push(parseInt(cursor));
    }
    
    // Add WHERE clause if we have conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Order by ID for consistent pagination
    query += ' ORDER BY id ASC';
    
    // Add limit if provided
    const parsedLimit = limit ? parseInt(limit) : undefined;
    if (parsedLimit && parsedLimit > 0) {
      query += ' LIMIT ?';
      params.push(parsedLimit);
    }
    
    // Execute query
    const result = await c.env.DB.prepare(query).bind(...params).all();
    
    if (!result.success) {
      console.error('Database query failed:', result.error);
      return c.json({ error: 'Failed to fetch spores' }, 500);
    }
    
    const spores = result.results as SporeRecord[];
    
    // Get total count (for the same filter conditions, excluding cursor and limit)
    let countQuery = 'SELECT COUNT(*) as total FROM spores';
    const countParams: (string | number)[] = [];
    const countConditions: string[] = [];
    
    // Apply same bounding box conditions for count
    if (minLat !== undefined) {
      countConditions.push('lat >= ?');
      countParams.push(parseFloat(minLat));
    }
    
    if (maxLat !== undefined) {
      countConditions.push('lat <= ?');
      countParams.push(parseFloat(maxLat));
    }
    
    if (minLng !== undefined) {
      countConditions.push('lng >= ?');
      countParams.push(parseFloat(minLng));
    }
    
    if (maxLng !== undefined) {
      countConditions.push('lng <= ?');
      countParams.push(parseFloat(maxLng));
    }
    
    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }
    
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const totalCount = countResult ? (countResult as CountResult).total : 0;
    
    // Determine next cursor
    let nextCursor: number | null = null;
    if (spores.length > 0 && parsedLimit && spores.length === parsedLimit) {
      nextCursor = spores[spores.length - 1].id;
    }
    
    return c.json({
      spores,
      total: totalCount,
      pagination: {
        cursor: cursor ? parseInt(cursor) : null,
        nextCursor,
        limit: parsedLimit || null,
        hasMore: nextCursor !== null
      }
    });
    
  } catch (error) {
    console.error('Error fetching spores:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;