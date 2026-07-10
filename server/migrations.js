const pool = require('./db')

const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        national_id VARCHAR(20),
        role VARCHAR(20) DEFAULT 'applicant',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS loan_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        loan_amount DECIMAL NOT NULL,
        purpose VARCHAR(255),
        employment_status VARCHAR(50),
        stable_income BOOLEAN,
        previous_repayment BOOLEAN,
        credit_score INT,
        status VARCHAR(50) DEFAULT 'submitted',
        admin_note TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS credit_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        application_id UUID REFERENCES loan_applications(id),
        score INT,
        score_breakdown JSON,
        risk_level VARCHAR(20),
        calculated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS evaluation_fees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID REFERENCES loan_applications(id),
        amount DECIMAL,
        checkout_request_id VARCHAR(100),
        mpesa_transaction_id VARCHAR(100),
        payment_status VARCHAR(50) DEFAULT 'pending',
        paid_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS loan_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id UUID REFERENCES loan_applications(id),
        reviewed_by UUID REFERENCES users(id),
        approved_amount DECIMAL,
        interest_rate DECIMAL,
        repayment_months INT,
        status VARCHAR(50) DEFAULT 'pending',
        offered_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS repayments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loan_offer_id UUID REFERENCES loan_offers(id),
        amount_paid DECIMAL,
        mpesa_transaction_id VARCHAR(100),
        paid_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        meta JSON,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('All tables created successfully')
  } catch (err) {
    console.error('Error creating tables', err)
    } finally {
    await pool.query(`ALTER TABLE evaluation_fees ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100)`)
    await pool.query(`ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS admin_note TEXT`)
    await pool.query(`ALTER TABLE loan_offers ADD COLUMN IF NOT EXISTS mpesa_transaction_id VARCHAR(100)`)
    await pool.query(`ALTER TABLE repayments ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100)`)
    await pool.query(`ALTER TABLE repayments ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending'`)
    process.exit()
  }
}

createTables()