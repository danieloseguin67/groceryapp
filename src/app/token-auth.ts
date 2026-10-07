export interface Customer {
  customer_id: string;
  apptoken: string;
  customer_name: string;
}

export async function verifyAppToken(token: string, storedHash: string): Promise<boolean> {
  const match = /^pbkdf2-sha256\$600000\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(storedHash);
  if (!match) {
    throw new Error('Invalid stored application token hash. Run the customer token migration.');
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error('Token verification requires HTTPS or localhost and Web Crypto support.');
  }

  const salt = new Uint8Array(match[1].match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
    key,
    256
  );
  const actualHash = Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
  let difference = 0;
  for (let index = 0; index < actualHash.length; index++) {
    difference |= actualHash.charCodeAt(index) ^ match[2].charCodeAt(index);
  }
  return difference === 0;
}
