import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const { username, password } = body;

        if (!username || !password) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Vui lòng nhập tài khoản và mật khẩu!'
                }),
                { status: 400, headers }
            );
        }

        // Verify credentials from database
        const result = await sql`
            SELECT id, username FROM admins 
            WHERE username = ${username} AND password = ${password}
        `;

        if (result.length > 0) {
            // Generate a simple session token
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'Đăng nhập thành công!',
                    token: token
                }),
                { headers }
            );
        } else {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Sai tài khoản hoặc mật khẩu!'
                }),
                { status: 401, headers }
            );
        }
    } catch (error) {
        console.error('Auth error:', error);
        return new Response(
            JSON.stringify({ error: 'Authentication error', details: error.message }),
            { status: 500, headers }
        );
    }
};
