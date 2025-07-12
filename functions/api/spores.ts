interface Env {
  DB: D1Database;
  RATE_LIMITER?: KVNamespace;
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

async function checkRateLimit(env: Env, cookieId: string): Promise<boolean> {
  if (!env.RATE_LIMITER) {
    return true; // No rate limiting if KV is not available
  }

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

  const { lat, lng, message, cookie_id } = data as Record<string, unknown>;

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

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const data = await context.request.json();
    const validation = validateSporeData(data);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const sporeData = validation.sporeData!;

    // Check rate limit
    const rateLimitOk = await checkRateLimit(context.env, sporeData.cookie_id);
    if (!rateLimitOk) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. You can only create 5 spores per hour.'
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Get client IP address
    const clientIP = context.request.headers.get('CF-Connecting-IP') ||
      context.request.headers.get('X-Forwarded-For') ||
      'unknown';

    // Insert into database
    const result = await context.env.DB.prepare(`
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
      return new Response(JSON.stringify({ error: 'Failed to create spore' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      id: result.meta.last_row_id,
      message: 'Spore created successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error creating spore:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const url = new URL(context.request.url);
    const { searchParams } = url;

    // Parse query parameters
    const minLat = searchParams.get('minLat');
    const maxLat = searchParams.get('maxLat');
    const minLng = searchParams.get('minLng');
    const maxLng = searchParams.get('maxLng');
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit');

    let query = 'SELECT id, lat, lng, message, cookie_id, created_at FROM spores';
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    // Add bounding box filtering if provided
    if (minLat !== null) {
      conditions.push('lat >= ?');
      params.push(parseFloat(minLat));
    }

    if (maxLat !== null) {
      conditions.push('lat <= ?');
      params.push(parseFloat(maxLat));
    }

    if (minLng !== null) {
      conditions.push('lng >= ?');
      params.push(parseFloat(minLng));
    }

    if (maxLng !== null) {
      conditions.push('lng <= ?');
      params.push(parseFloat(maxLng));
    }

    // Add cursor-based pagination if provided
    if (cursor !== null) {
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
    const result = await context.env.DB.prepare(query).bind(...params).all();

    if (!result.success) {
      console.error('Database query failed:', result.error);
      return new Response(JSON.stringify({ error: 'Failed to fetch spores' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const spores = result.results as SporeRecord[];

    // Get total count (for the same filter conditions, excluding cursor and limit)
    let countQuery = 'SELECT COUNT(*) as total FROM spores';
    const countParams: (string | number)[] = [];
    const countConditions: string[] = [];

    // Apply same bounding box conditions for count
    if (minLat !== null) {
      countConditions.push('lat >= ?');
      countParams.push(parseFloat(minLat));
    }

    if (maxLat !== null) {
      countConditions.push('lat <= ?');
      countParams.push(parseFloat(maxLat));
    }

    if (minLng !== null) {
      countConditions.push('lng >= ?');
      countParams.push(parseFloat(minLng));
    }

    if (maxLng !== null) {
      countConditions.push('lng <= ?');
      countParams.push(parseFloat(maxLng));
    }

    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }

    const countResult = await context.env.DB.prepare(countQuery).bind(...countParams).first();
    const totalCount = countResult ? (countResult as CountResult).total : 0;

    // Determine next cursor
    let nextCursor: number | null = null;
    if (spores.length > 0 && parsedLimit && spores.length === parsedLimit) {
      nextCursor = spores[spores.length - 1].id;
    }

    return new Response(JSON.stringify({
      spores,
      total: totalCount,
      pagination: {
        cursor: cursor ? parseInt(cursor) : null,
        nextCursor,
        limit: parsedLimit || null,
        hasMore: nextCursor !== null
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Error fetching spores:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}