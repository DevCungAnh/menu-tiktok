import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        // Create orders table if not exists
        await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        service_category VARCHAR(50) NOT NULL,
        service_type VARCHAR(255) NOT NULL,
        note TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

        // Create indexes for better performance
        await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `;

        await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)
    `;

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Database initialized successfully! Bảng orders đã được tạo.'
            }),
            { headers }
        );
    } catch (error) {
        console.error('Init DB error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: 'Failed to initialize database',
                details: error.message
            }),
            { status: 500, headers }
        );
    }
};
