const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { hashToken, migrateCustomers } = require('./hash-customer-tokens.cjs');

function loadTypeScript(relativePath, dependencies = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      experimentalDecorators: true
    }
  }).outputText;
  const context = {
    exports: {},
    crypto: webcrypto,
    TextEncoder,
    Uint8Array,
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals
  };
  vm.runInNewContext(compiled, context);
  return context.exports;
}

const auth = loadTypeScript('src\\app\\token-auth.ts');
const sampleToken = 'Test-only password with accents: épicerie';
const sampleHash = hashToken(sampleToken);

test('Web Crypto accepts the original token and rejects wrong and empty tokens', async () => {
  assert.equal(await auth.verifyAppToken(sampleToken, sampleHash), true);
  assert.equal(await auth.verifyAppToken(sampleToken.toUpperCase(), sampleHash), false);
  assert.equal(await auth.verifyAppToken('', sampleHash), false);
  assert.notEqual(hashToken(sampleToken), sampleHash);
});

test('malformed hashes and unavailable Web Crypto fail explicitly', async () => {
  for (const value of ['plaintext', 'pbkdf2-sha256$1$bad$bad']) {
    await assert.rejects(auth.verifyAppToken(sampleToken, value), /Invalid stored/);
  }
  const unavailable = loadTypeScript('src\\app\\token-auth.ts', {}, { crypto: undefined });
  await assert.rejects(unavailable.verifyAppToken(sampleToken, sampleHash), /HTTPS or localhost/);
});

test('migration preserves customer fields, verifies tokens, and is idempotent', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'grocery-token-test-'));
  const file = path.join(directory, 'customers.json');
  try {
    fs.writeFileSync(file, JSON.stringify([
      { customer_id: 'test', customer_name: 'Test Customer', apptoken: sampleToken },
      { customer_id: 'hashed', customer_name: 'Existing', apptoken: sampleHash }
    ]));
    assert.equal(migrateCustomers(file), 1);
    const migrated = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(migrated[0].customer_name, 'Test Customer');
    assert.equal(migrated[0].customer_id, 'test');
    assert.equal(await auth.verifyAppToken(sampleToken, migrated[0].apptoken), true);
    assert.equal(migrated[1].apptoken, sampleHash);
    const contents = fs.readFileSync(file, 'utf8');
    assert.equal(migrateCustomers(file), 0);
    assert.equal(fs.readFileSync(file, 'utf8'), contents);

    fs.writeFileSync(file, JSON.stringify([{ customer_id: 'test', customer_name: 'Test', apptoken: '' }]));
    const invalid = fs.readFileSync(file, 'utf8');
    assert.throws(() => migrateCustomers(file), /nonempty apptoken/);
    assert.equal(fs.readFileSync(file, 'utf8'), invalid);
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
});

function loginFixture() {
  const stored = new Map();
  const navigations = [];
  const errors = [];
  const { LoginComponent } = loadTypeScript('src\\app\\login.component.ts', {
    '@angular/core': { Component: () => () => {} },
    '@angular/common/http': {},
    '@angular/router': {},
    './token-auth': auth
  }, {
    localStorage: { setItem: (key, value) => stored.set(key, value) },
    setTimeout: callback => callback(),
    console: { error: (...args) => errors.push(args) }
  });
  const component = new LoginComponent({}, { navigate: url => navigations.push(url) });
  component.customers = [{ customer_id: 'test', customer_name: 'Test', apptoken: sampleHash }];
  component.customerId = 'test';
  component.appToken = sampleToken;
  return { component, stored, navigations, errors };
}

test('successful login stores the matched ID, clears the token, and blocks duplicate submissions', async () => {
  const { component, stored, navigations } = loginFixture();
  const first = component.onLogin();
  assert.equal(component.isLoggingIn, true);
  await component.onLogin();
  await first;
  assert.equal(component.loginSuccess, true);
  assert.equal(component.isLoggingIn, false);
  assert.equal(component.appToken, '');
  assert.equal(stored.get('customerId'), 'test');
  assert.equal(navigations.length, 1);
});

test('wrong token and unknown customer never create a session', async () => {
  for (const unknown of [false, true]) {
    const { component, stored, navigations } = loginFixture();
    if (unknown) component.customerId = 'unknown';
    else component.appToken = 'wrong';
    await component.onLogin();
    assert.equal(component.loginSuccess, false);
    assert.equal(component.isLoggingIn, false);
    assert.match(component.loginError, /incorrect/);
    assert.equal(stored.size, 0);
    assert.equal(navigations.length, 0);
  }
});

test('invalid stored credentials report a verification error without creating a session', async () => {
  const { component, stored, errors } = loginFixture();
  component.customers[0].apptoken = 'invalid';
  await component.onLogin();
  assert.match(component.loginError, /Unable to verify/);
  assert.equal(component.isLoggingIn, false);
  assert.equal(stored.size, 0);
  assert.equal(errors.length, 1);
});
