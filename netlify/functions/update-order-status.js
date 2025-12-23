import { neon } from '@neondatabase/serverless';

// Simple token verification
function verifyToken(token) {
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [username, timestamp] = decoded.split(':');
        // Token expires after 24 hours
        const tokenAge = Date.now() - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        return username && tokenAge < maxAge;
    } catch {
        return false;
    }
}

export default async (req, context) => {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );
    }

    try {
        const body = await req.json();

        // Verify admin token for status updates
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!verifyToken(token)) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized. Please login as admin.' }),
                { status: 401, headers }
            );
        }

        if (!body.id || !body.status) {
            return new Response(
                JSON.stringify({ error: 'Missing id or status' }),
                { status: 400, headers }
            );
        }

        // Validate status value
        const validStatuses = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];
        if (!validStatuses.includes(body.status)) {
            return new Response(
                JSON.stringify({ error: 'Invalid status value' }),
                { status: 400, headers }
            );
        }

        const result = await sql`
      UPDATE orders 
      SET status = ${body.status}, updated_at = NOW()
      WHERE id = ${body.id}
      RETURNING *
    `;

        if (result.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { status: 404, headers }
            );
        }

        return new Response(JSON.stringify(result[0]), { headers });
    } catch (error) {
        console.error('Database error:', error);
        return new Response(
            JSON.stringify({ error: 'Database error', details: error.message }),
            { status: 500, headers }
        );
    }
};
