import { neon } from '@neondatabase/serverless';

export default async (req, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  // Require secret key to init database (set INIT_SECRET in Netlify ENV)
  const url = new URL(req.url);
  const secretKey = url.searchParams.get('key');
  const requiredKey = process.env.INIT_SECRET || 'setup2024';

  if (secretKey !== requiredKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized. Provide ?key=YOUR_SECRET'
      }),
      { status: 401, headers }
    );
  }

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

    // Create indexes for orders
    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)
    `;

    // Create admins table if not exists
    await sql`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create services table if not exists (menu display items - no category)
    await sql`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        icon_url TEXT,
        badges VARCHAR(50),
        is_hot BOOLEAN DEFAULT FALSE,
        qty INTEGER DEFAULT 1,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_services_sort ON services(sort_order ASC)
    `;

    // Check if admin user exists
    const existingAdmin = await sql`
      SELECT id FROM admins WHERE username = 'admin'
    `;

    // Create default admin from ENV variables if not exists
    let adminCreated = false;
    if (existingAdmin.length === 0) {
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!';
      await sql`
        INSERT INTO admins (username, password) 
        VALUES ('admin', ${defaultPassword})
      `;
      adminCreated = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database initialized! Bảng orders, admins, và services đã được tạo.',
        adminCreated: adminCreated,
        note: adminCreated ? 'Admin user created. Change password immediately!' : 'Admin already exists'
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
