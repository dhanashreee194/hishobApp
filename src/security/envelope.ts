import {gcm} from '@noble/ciphers/aes.js';
import {bytesToUtf8, equalBytes, randomBytes, utf8ToBytes} from '@noble/ciphers/utils.js';
import {pbkdf2} from '@noble/hashes/pbkdf2.js';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js';

export const PIN_ITERATIONS = 20_000;

export class BackupPinRequired extends Error {
  constructor() {
    super('या बॅकअपसाठी पिन हवा');
    this.name = 'BackupPinRequired';
  }
}

export type WrappedKey = {
  salt: string;
  nonce: string;
  iterations: number;
  ciphertext: string;
};

export type PinHash = {
  iterations: number;
  salt: string;
  hash: string;
};

type Envelope = {
  version: 2;
  nonce: string;
  ciphertext: string;
  wrappedKey: WrappedKey | null;
};

export function hashPin(pin: string, iterations = PIN_ITERATIONS): PinHash {
  const salt = randomBytes(16);
  const hash = pbkdf2(sha256, utf8ToBytes(pin), salt, {c: iterations, dkLen: 32});
  return {iterations, salt: bytesToHex(salt), hash: bytesToHex(hash)};
}

export function verifyPin(pin: string, stored: PinHash): boolean {
  const hash = pbkdf2(sha256, utf8ToBytes(pin), hexToBytes(stored.salt), {
    c: stored.iterations,
    dkLen: 32,
  });
  return equalBytes(hash, hexToBytes(stored.hash));
}

export function serializePinHash(stored: PinHash): string {
  return `v1:${stored.iterations}:${stored.salt}:${stored.hash}`;
}

export function parsePinHash(value: string): PinHash | null {
  const [version, iterations, salt, hash] = value.split(':');
  const count = Number(iterations);
  if (version !== 'v1' || !Number.isFinite(count) || !salt || !hash) {
    return null;
  }
  return {iterations: count, salt, hash};
}

export function wrapKey(
  deviceKey: Uint8Array,
  pin: string,
  iterations = PIN_ITERATIONS,
): WrappedKey {
  const salt = randomBytes(16);
  const nonce = randomBytes(12);
  const kek = pbkdf2(sha256, utf8ToBytes(pin), salt, {c: iterations, dkLen: 32});
  return {
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    iterations,
    ciphertext: bytesToHex(gcm(kek, nonce).encrypt(deviceKey)),
  };
}

export function unwrapKey(wrapped: WrappedKey, pin: string): Uint8Array {
  const kek = pbkdf2(sha256, utf8ToBytes(pin), hexToBytes(wrapped.salt), {
    c: wrapped.iterations,
    dkLen: 32,
  });
  return gcm(kek, hexToBytes(wrapped.nonce)).decrypt(hexToBytes(wrapped.ciphertext));
}

export function sealSnapshot(
  json: string,
  deviceKey: Uint8Array,
  wrappedKey: WrappedKey | null,
): string {
  const nonce = randomBytes(12);
  const ciphertext = gcm(deviceKey, nonce).encrypt(utf8ToBytes(json));
  const envelope: Envelope = {
    version: 2,
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    wrappedKey,
  };
  return JSON.stringify(envelope);
}

export function openSnapshot(
  payload: string,
  deviceKey: Uint8Array | null,
  pin: string | null,
): string {
  const trimmed = payload.trim();
  let parsed: {version?: number; tables?: unknown; nonce?: string; ciphertext?: string; wrappedKey?: WrappedKey | null};
  try {
    parsed = JSON.parse(trimmed) as typeof parsed;
  } catch {
    throw new Error('ही बॅकअप फाइल ओळखली नाही');
  }
  if (parsed?.version === 1 && parsed.tables) {
    return trimmed;
  }
  if (parsed?.version !== 2 || !parsed.nonce || !parsed.ciphertext) {
    throw new Error('ही बॅकअप फाइल ओळखली नाही');
  }
  if (deviceKey) {
    try {
      return decryptSnapshot(
        {version: 2, nonce: parsed.nonce, ciphertext: parsed.ciphertext, wrappedKey: parsed.wrappedKey ?? null},
        deviceKey,
      );
    } catch {
      // A backup from another phone needs the PIN wrap.
    }
  }
  if (parsed.wrappedKey) {
    if (!pin) {
      throw new BackupPinRequired();
    }
    try {
      return decryptSnapshot(
        {version: 2, nonce: parsed.nonce, ciphertext: parsed.ciphertext, wrappedKey: parsed.wrappedKey},
        unwrapKey(parsed.wrappedKey, pin),
      );
    } catch {
      throw new Error('पिन चुकीचा आहे');
    }
  }
  throw new Error('हा बॅकअप या फोनवर उघडता येत नाही');
}

function decryptSnapshot(envelope: Envelope, key: Uint8Array): string {
  const plain = gcm(key, hexToBytes(envelope.nonce)).decrypt(hexToBytes(envelope.ciphertext));
  return bytesToUtf8(plain);
}
