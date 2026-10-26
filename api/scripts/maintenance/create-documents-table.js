// Create documents table in PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://cecbs:cecbs123@localhost:5432/cecbs'
});

async function createDocumentsTable() {
  try {
    console.log('Creating documents table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) UNIQUE NOT NULL,
        document_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_hash VARCHAR(255) NOT NULL,
        ipfs_cid VARCHAR(255),
        uploaded_by VARCHAR(255) NOT NULL,
        encrypted BOOLEAN DEFAULT false,
        description TEXT,
        metadata JSONB DEFAULT '{}',
        verification_status VARCHAR(50) DEFAULT 'pending',
        verified_by VARCHAR(255),
        verified_at TIMESTAMP,
        verification_notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );
    `);
    
    console.log('✅ Documents table created successfully');
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)');
    
    console.log('✅ Indexes created successfully');
    
    await pool.end();
    console.log('✅ All done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createDocumentsTable();
