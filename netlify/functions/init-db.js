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
    // Create orders table if not exists (Version 2 - customer_phone is optional)
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20),
        service_category VARCHAR(50) NOT NULL,
        service_type VARCHAR(255) NOT NULL,
        note TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Migration: Allow customer_phone to be NULL if the table already exists
    try {
      await sql`ALTER TABLE orders ALTER COLUMN customer_phone DROP NOT NULL`;
    } catch (e) {
      console.log('Migration note: customer_phone already nullable or table being created now');
    }

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

    // Create service_categories table (for order form dropdown)
    await sql`
      CREATE TABLE IF NOT EXISTS service_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        icon VARCHAR(50),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create service_options table (options within each category)
    await sql`
      CREATE TABLE IF NOT EXISTS service_options (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES service_categories(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        label VARCHAR(255) NOT NULL,
        details TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_options_category ON service_options(category_id)
    `;

    // Seed default categories if empty
    const existingCategories = await sql`SELECT id FROM service_categories LIMIT 1`;
    if (existingCategories.length === 0) {
      // Insert Free category
      const freeResult = await sql`
        INSERT INTO service_categories (name, code, icon, sort_order) 
        VALUES ('Free hữu duyên', 'free', '🎁', 1)
        RETURNING id
      `;
      const freeId = freeResult[0].id;

      // Insert Combo category
      const comboResult = await sql`
        INSERT INTO service_categories (name, code, icon, sort_order) 
        VALUES ('Combo chuyển khoản', 'combo', '💎', 2)
        RETURNING id
      `;
      const comboId = comboResult[0].id;

      // Insert Free options
      await sql`
        INSERT INTO service_options (category_id, name, label, sort_order) VALUES
        (${freeId}, '50 Tim FREE', '🎁 50 Tim', 1),
        (${freeId}, '5000 View FREE', '🎁 5000 View', 2)
      `;

      // Insert Combo options with details
      await sql`
        INSERT INTO service_options (category_id, name, label, details, sort_order) VALUES
        (${comboId}, 'Combo 1 - 10K', '💎 Combo 1 - 10K', '["200 Tim (Không tụt)","5.000 View xuhuong","5 bình luận (viết tay)","100 Yêu Thích","100 Share"]', 1),
        (${comboId}, 'Combo 2 - 20K', '💎 Combo 2 - 20K', '["100 FL Chất Lượng Cao","500 Tim (Không tụt)","10.000 View xuhuong","10 bình luận (viết tay)","200 Yêu Thích","200 Share"]', 2),
        (${comboId}, 'Combo 3 - 35K', '💎 Combo 3 - 35K', '["250 FL Chất Lượng Cao","1000 Tim (Không tụt)","25.000 View xuhuong","20 bình luận (viết tay)","500 Yêu Thích","500 Share"]', 3),
        (${comboId}, 'Combo 4 - 50K', '💎 Combo 4 - 50K', '["350 FL Chất Lượng Cao","1500 Tim (Không tụt)","35.000 View xuhuong","25 bình luận (viết tay)","400 Yêu Thích","400 Share"]', 4),
        (${comboId}, 'Combo 5 - 75K', '💎 Combo 5 - 75K', '["500 FL Chất Lượng Cao","2000 Tim (Không tụt)","50.000 View xuhuong","30 bình luận (viết tay)","500 Yêu Thích","500 Share"]', 5),
        (${comboId}, 'Combo VIP - 100K', '👑 Combo VIP - 100K', '["1000 FL Chất Lượng Cao","3000 Tim (Không tụt)","70.000 View xuhuong","50 bình luận (viết tay)","500 Yêu Thích","500 Share"]', 6)
      `;
    }

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
        message: 'Database initialized! Bảng orders, admins, services, service_categories, service_options đã được tạo.',
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
