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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const isOptionsEndpoint = pathParts.includes('options');

    try {
        // ============ GET - Lấy categories và options ============
        if (req.method === 'GET') {
            const showAll = url.searchParams.get('all') === 'true';

            // Get categories
            let categories;
            if (showAll) {
                categories = await sql`
                    SELECT * FROM service_categories 
                    ORDER BY sort_order ASC, id ASC
                `;
            } else {
                categories = await sql`
                    SELECT * FROM service_categories 
                    WHERE is_active = true 
                    ORDER BY sort_order ASC, id ASC
                `;
            }

            // Get options for each category
            for (let cat of categories) {
                if (showAll) {
                    cat.options = await sql`
                        SELECT * FROM service_options 
                        WHERE category_id = ${cat.id}
                        ORDER BY sort_order ASC, id ASC
                    `;
                } else {
                    cat.options = await sql`
                        SELECT * FROM service_options 
                        WHERE category_id = ${cat.id} AND is_active = true
                        ORDER BY sort_order ASC, id ASC
                    `;
                }
            }

            return new Response(JSON.stringify(categories), { headers });
        }

        // ============ POST - Create category or option ============
        if (req.method === 'POST') {
            if (!checkAuth(req)) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
            }

            const body = await req.json();

            if (isOptionsEndpoint) {
                // Create option
                const { category_id, name, label, details, sort_order } = body;
                if (!category_id || !name || !label) {
                    return new Response(JSON.stringify({ error: 'category_id, name and label are required' }), { status: 400, headers });
                }

                const result = await sql`
                    INSERT INTO service_options (category_id, name, label, details, sort_order)
                    VALUES (${category_id}, ${name}, ${label}, ${details || null}, ${sort_order || 0})
                    RETURNING *
                `;
                return new Response(JSON.stringify(result[0]), { status: 201, headers });
            } else {
                // Create category
                const { name, code, icon, sort_order } = body;
                if (!name || !code) {
                    return new Response(JSON.stringify({ error: 'name and code are required' }), { status: 400, headers });
                }

                const result = await sql`
                    INSERT INTO service_categories (name, code, icon, sort_order)
                    VALUES (${name}, ${code}, ${icon || '📦'}, ${sort_order || 0})
                    RETURNING *
                `;
                return new Response(JSON.stringify(result[0]), { status: 201, headers });
            }
        }

        // ============ PUT - Update category or option ============
        if (req.method === 'PUT') {
            if (!checkAuth(req)) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
            }

            const body = await req.json();
            const { id } = body;

            if (!id) {
                return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400, headers });
            }

            if (isOptionsEndpoint) {
                // Update option
                const { name, label, details, sort_order, is_active } = body;
                const result = await sql`
                    UPDATE service_options SET
                        name = COALESCE(${name}, name),
                        label = COALESCE(${label}, label),
                        details = COALESCE(${details}, details),
                        sort_order = COALESCE(${sort_order}, sort_order),
                        is_active = COALESCE(${is_active}, is_active)
                    WHERE id = ${id}
                    RETURNING *
                `;
                if (result.length === 0) {
                    return new Response(JSON.stringify({ error: 'Option not found' }), { status: 404, headers });
                }
                return new Response(JSON.stringify(result[0]), { headers });
            } else {
                // Update category
                const { name, code, icon, sort_order, is_active } = body;
                const result = await sql`
                    UPDATE service_categories SET
                        name = COALESCE(${name}, name),
                        code = COALESCE(${code}, code),
                        icon = COALESCE(${icon}, icon),
                        sort_order = COALESCE(${sort_order}, sort_order),
                        is_active = COALESCE(${is_active}, is_active)
                    WHERE id = ${id}
                    RETURNING *
                `;
                if (result.length === 0) {
                    return new Response(JSON.stringify({ error: 'Category not found' }), { status: 404, headers });
                }
                return new Response(JSON.stringify(result[0]), { headers });
            }
        }

        // ============ DELETE - Delete category or option ============
        if (req.method === 'DELETE') {
            if (!checkAuth(req)) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
            }

            const body = await req.json();
            const { id } = body;

            if (!id) {
                return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400, headers });
            }

            if (isOptionsEndpoint) {
                await sql`DELETE FROM service_options WHERE id = ${id}`;
            } else {
                await sql`DELETE FROM service_categories WHERE id = ${id}`;
            }

            return new Response(JSON.stringify({ success: true }), { headers });
        }

        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

    } catch (error) {
        console.error('Categories API error:', error);
        console.error('Error stack:', error.stack);
        return new Response(
            JSON.stringify({
                error: 'Server error',
                details: error.message,
                hint: 'Bạn đã chạy init-db chưa? Truy cập: /.netlify/functions/init-db?key=setup2025'
            }),
            { status: 500, headers }
        );
    }
};
