import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    // Helper: Check admin token
    const checkAuth = (req) => {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return false;
        }
        const token = authHeader.substring(7);
        try {
            const decoded = atob(token);
            return decoded.includes(':');
        } catch {
            return false;
        }
    };

    try {
        // GET - Lấy services (public: only active, admin: ?all=true for all)
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const showAll = url.searchParams.get('all') === 'true';

            let services;
            if (showAll) {
                // Admin view - show all services
                services = await sql`
                    SELECT * FROM services 
                    ORDER BY sort_order ASC, id ASC
                `;
            } else {
                // Public view - only active services
                services = await sql`
                    SELECT * FROM services 
                    WHERE is_active = true 
                    ORDER BY sort_order ASC, id ASC
                `;
            }
            return new Response(JSON.stringify(services), { headers });
        }

        // POST - Tạo service mới (admin only)
        if (req.method === 'POST') {
            if (!checkAuth(req)) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401, headers }
                );
            }

            const body = await req.json();
            const { name, icon_url, badges, is_hot, qty, description, sort_order } = body;

            if (!name) {
                return new Response(
                    JSON.stringify({ error: 'Name is required' }),
                    { status: 400, headers }
                );
            }

            const result = await sql`
                INSERT INTO services (name, icon_url, badges, is_hot, qty, description, sort_order)
                VALUES (${name}, ${icon_url || null}, ${badges || null}, ${is_hot || false}, ${qty || 1}, ${description || null}, ${sort_order || 0})
                RETURNING *
            `;

            return new Response(JSON.stringify(result[0]), { status: 201, headers });
        }

        // PUT - Cập nhật service (admin only)
        if (req.method === 'PUT') {
            if (!checkAuth(req)) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401, headers }
                );
            }

            const body = await req.json();
            const { id, name, icon_url, badges, is_hot, qty, description, sort_order, is_active } = body;

            if (!id) {
                return new Response(
                    JSON.stringify({ error: 'Service ID is required' }),
                    { status: 400, headers }
                );
            }

            const result = await sql`
                UPDATE services SET
                    name = COALESCE(${name}, name),
                    icon_url = COALESCE(${icon_url}, icon_url),
                    badges = COALESCE(${badges}, badges),
                    is_hot = COALESCE(${is_hot}, is_hot),
                    qty = COALESCE(${qty}, qty),
                    description = COALESCE(${description}, description),
                    sort_order = COALESCE(${sort_order}, sort_order),
                    is_active = COALESCE(${is_active}, is_active)
                WHERE id = ${id}
                RETURNING *
            `;

            if (result.length === 0) {
                return new Response(
                    JSON.stringify({ error: 'Service not found' }),
                    { status: 404, headers }
                );
            }

            return new Response(JSON.stringify(result[0]), { headers });
        }

        // DELETE - Xóa service (admin only)
        if (req.method === 'DELETE') {
            if (!checkAuth(req)) {
                return new Response(
                    JSON.stringify({ error: 'Unauthorized' }),
                    { status: 401, headers }
                );
            }

            const body = await req.json();
            const { id } = body;

            if (!id) {
                return new Response(
                    JSON.stringify({ error: 'Service ID is required' }),
                    { status: 400, headers }
                );
            }

            await sql`DELETE FROM services WHERE id = ${id}`;

            return new Response(JSON.stringify({ success: true, message: 'Service deleted' }), { headers });
        }

        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );

    } catch (error) {
        console.error('Services API error:', error);
        return new Response(
            JSON.stringify({ error: 'Server error', details: error.message }),
            { status: 500, headers }
        );
    }
};
