import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        // GET - Lấy tất cả đơn hàng
        if (req.method === 'GET') {
            const orders = await sql`
        SELECT * FROM orders 
        ORDER BY created_at DESC
      `;
            return new Response(JSON.stringify(orders), { headers });
        }

        // POST - Tạo đơn hàng mới
        if (req.method === 'POST') {
            const body = await req.json();

            // Validate required fields
            if (!body.name || !body.phone || !body.category || !body.service) {
                return new Response(
                    JSON.stringify({ error: 'Missing required fields' }),
                    { status: 400, headers }
                );
            }

            const result = await sql`
        INSERT INTO orders (customer_name, customer_phone, service_category, service_type, note, status)
        VALUES (${body.name}, ${body.phone}, ${body.category}, ${body.service}, ${body.note || ''}, 'pending')
        RETURNING *
      `;

            return new Response(JSON.stringify(result[0]), {
                status: 201,
                headers
            });
        }

        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );
    } catch (error) {
        console.error('Database error:', error);
        return new Response(
            JSON.stringify({ error: 'Database error', details: error.message }),
            { status: 500, headers }
        );
    }
};
