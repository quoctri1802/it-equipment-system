import pg from 'pg';

const { Pool } = pg;

// Prevent multiple pools in development hot-reloading
let pool;
if (!global.pgPool) {
  global.pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon
    }
  });
}
pool = global.pgPool;

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
}

export async function initDatabase() {
  console.log('Initializing database schema...');
  
  // 1. Create categories table
  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT
    );
  `);

  // 2. Create users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL, -- admin, director, accountant, itstaff, depthead
      name VARCHAR(100) NOT NULL,
      department VARCHAR(100)
    );
  `);

  // 3. Create devices table
  await query(`
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      asset_code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      model VARCHAR(100),
      manufacturer VARCHAR(100),
      serial_number VARCHAR(100) UNIQUE,
      specifications JSONB DEFAULT '{}'::jsonb,
      location VARCHAR(100) DEFAULT 'Kho thiết bị',
      status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, active, broken, maintenance, waiting_liquidation, liquidated
      purchase_date DATE,
      purchase_price NUMERIC(15, 2) DEFAULT 0,
      funding_source VARCHAR(100),
      supplier VARCHAR(150),
      warranty_months INTEGER DEFAULT 12,
      warranty_start DATE,
      warranty_end DATE,
      contract_details TEXT,
      qr_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Create allocation_logs table
  await query(`
    CREATE TABLE IF NOT EXISTS allocation_logs (
      id SERIAL PRIMARY KEY,
      device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL, -- import, allocate, transfer, recall, liquidate
      from_dept VARCHAR(100),
      to_dept VARCHAR(100),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );
  `);

  // 5. Create incidents table
  await query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
      reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(30) DEFAULT 'reported', -- reported, processing, resolved
      reported_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_date TIMESTAMP,
      repair_cost NUMERIC(15, 2) DEFAULT 0,
      parts_used TEXT,
      notes TEXT
    );
  `);

  // 6. Create maintenance_plans table
  await query(`
    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id SERIAL PRIMARY KEY,
      device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      planned_date DATE NOT NULL,
      completed_date DATE,
      status VARCHAR(30) DEFAULT 'planned', -- planned, completed
      cost NUMERIC(15, 2) DEFAULT 0,
      performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT
    );
  `);

  // 7. Create consumables table
  await query(`
    CREATE TABLE IF NOT EXISTS consumables (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) NOT NULL, -- ram, ssd, hdd, ink, paper, power, cable, other
      current_qty INTEGER DEFAULT 0,
      min_qty INTEGER DEFAULT 5,
      unit VARCHAR(20) DEFAULT 'Cái',
      price NUMERIC(15, 2) DEFAULT 0
    );
  `);

  // 8. Create consumable_logs table
  await query(`
    CREATE TABLE IF NOT EXISTS consumable_logs (
      id SERIAL PRIMARY KEY,
      consumable_id INTEGER NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL, -- import, export
      quantity INTEGER NOT NULL,
      device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
      action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );
  `);

  // 9. Create audit_logs table
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      username VARCHAR(100),
      action VARCHAR(255) NOT NULL,
      details TEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. Create support_requests table
  await query(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id SERIAL PRIMARY KEY,
      device_id INTEGER REFERENCES devices(id) ON DELETE SET NULL,
      request_type VARCHAR(50) NOT NULL, -- repair, upgrade, borrow
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'submitted', -- submitted, approved, processing, completed, rejected
      priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
      requester_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      target_date DATE,
      department VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 11. Create contracts table
  await query(`
    CREATE TABLE IF NOT EXISTS contracts (
      id SERIAL PRIMARY KEY,
      contract_number VARCHAR(100) NOT NULL UNIQUE,
      supplier VARCHAR(255) NOT NULL,
      service TEXT,
      value NUMERIC(15, 2) DEFAULT 0,
      start_date DATE,
      end_date DATE,
      contact VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Create departments table
  await query(`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate/Update maintenance_plans table to add columns for CMMS features if not exists
  await query(`
    ALTER TABLE maintenance_plans 
    ADD COLUMN IF NOT EXISTS recurrence VARCHAR(30) DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS parts_used VARCHAR(255),
    ADD COLUMN IF NOT EXISTS parent_plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE SET NULL;
  `);

  // Seed default data if empty
  const deptsCount = await query('SELECT count(*) FROM departments');
  if (parseInt(deptsCount.rows[0].count) === 0) {
    await query(`
      INSERT INTO departments (name, description) VALUES
      ('Kho thiết bị', 'Kho lưu trữ thiết bị chính của bệnh viện'),
      ('Phòng CNTT', 'Tổ Công nghệ thông tin - Quản trị hệ thống'),
      ('Khoa Cấp Cứu', 'Bộ phận cấp cứu và điều trị khẩn cấp'),
      ('Khoa Khám Bệnh', 'Phòng khám đa khoa và tiếp đón bệnh nhân'),
      ('Khoa Dược', 'Khoa quản lý và cấp phát dược phẩm, thuốc'),
      ('Phòng Kế Hoạch', 'Phòng Kế hoạch tổng hợp bệnh viện'),
      ('Phòng Hành Chính', 'Phòng Hành chính quản trị và nhân sự');
    `);
  }

  const categoriesCount = await query('SELECT count(*) FROM categories');
  if (parseInt(categoriesCount.rows[0].count) === 0) {
    await query(`
      INSERT INTO categories (name, description) VALUES
      ('Máy chủ (Server)', 'Hệ thống máy chủ lưu trữ dữ liệu, web, database của bệnh viện'),
      ('Thiết bị mạng (Network)', 'Router, Switch, Firewall, Access Point'),
      ('Máy trạm (PC/Laptop)', 'Máy tính làm việc tại các khoa/phòng khám'),
      ('Thiết bị ngoại vi', 'Máy in, máy scan, máy chiếu, đầu đọc mã vạch');
    `);
  }

  // Ensure consumables are present but with 0 current quantity
  const consumablesCount = await query('SELECT count(*) FROM consumables');
  if (parseInt(consumablesCount.rows[0].count) === 0) {
    await query(`
      INSERT INTO consumables (name, type, current_qty, min_qty, unit, price) VALUES
      ('RAM DDR4 8GB Kingston', 'ram', 0, 5, 'Thanh', 450000),
      ('SSD 256GB Crucial SATA', 'ssd', 0, 3, 'Ổ', 650000),
      ('SSD NVMe 500GB Samsung', 'ssd', 0, 3, 'Ổ', 1200000),
      ('Mực máy in Canon LBP 2900', 'ink', 0, 4, 'Hộp', 180000),
      ('Nguồn máy tính 500W', 'power', 0, 2, 'Cái', 400000),
      ('Cáp mạng Cat6 Ugreen 3m', 'cable', 0, 10, 'Sợi', 45000);
    `);
  }

  // Ensure admin user exists with admin@123 password
  const adminCheck = await query("SELECT id FROM users WHERE username = 'admin'");
  if (adminCheck.rows.length === 0) {
    await query("INSERT INTO users (username, password, role, name, department) VALUES ($1, $2, $3, $4, $5)", ['admin', 'admin@123', 'admin', 'Quản Trị Viên', 'Phòng CNTT']);
  }

  console.log('Database initialization completed successfully.');
}
