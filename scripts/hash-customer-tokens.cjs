const { randomBytes, pbkdf2Sync } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

function hashToken(token) {
  const salt = randomBytes(16);
  const digest = pbkdf2Sync(token, salt, 600000, 32, 'sha256');
  return `pbkdf2-sha256$600000$${salt.toString('hex')}$${digest.toString('hex')}`;
}

function migrateCustomers(filePath) {
  const customers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(customers) || !customers.every(customer =>
    customer && typeof customer.customer_id === 'string' &&
    typeof customer.customer_name === 'string' &&
    typeof customer.apptoken === 'string' && customer.apptoken.length > 0
  )) {
    throw new Error('Expected customer records with customer_id, customer_name, and a nonempty apptoken.');
  }

  let updated = 0;
  for (const customer of customers) {
    if (customer.apptoken.startsWith('pbkdf2-sha256$')) {
      if (!/^pbkdf2-sha256\$600000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(customer.apptoken)) {
        throw new Error('Invalid existing token hash; the file was not changed.');
      }
      continue;
    }
    customer.apptoken = hashToken(customer.apptoken);
    updated++;
  }
  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(customers, null, 2) + '\n', 'utf8');
  }
  return updated;
}

if (require.main === module) {
  const filePath = process.argv[2] || path.join(__dirname, '..', 'src', 'assets', 'customers.json');
  try {
    const updated = migrateCustomers(filePath);
    console.log(`Hashed ${updated} customer tokens. Existing hashes were preserved.`);
  } catch (error) {
    console.error(`Customer token migration failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { hashToken, migrateCustomers };
