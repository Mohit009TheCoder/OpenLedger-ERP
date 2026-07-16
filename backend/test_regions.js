const pg = require('pg');

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'sa-east-1', 'ca-central-1'
];

async function testConnection() {
  for (const region of regions) {
    const url = `postgresql://postgres.ciezrdpvytosfcktmqsd:Mohit@00900@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    console.log(`Trying ${region}...`);
    const pool = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
    try {
      const client = await pool.connect();
      console.log(`SUCCESS on region: ${region}`);
      client.release();
      process.exit(0);
    } catch (e) {
      // console.log(`Failed ${region}:`, e.message);
    }
    await pool.end();
  }
  console.log("None succeeded.");
}

testConnection();
