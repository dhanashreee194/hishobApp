import * as Keychain from 'react-native-keychain';
import {database} from '../db';
import {
  hashPin,
  parsePinHash,
  serializePinHash,
  verifyPin,
  WrappedKey,
  wrapKey,
} from './envelope';

const PIN_SERVICE = 'com.mazahishob.pin';
const KEY_SERVICE = 'com.mazahishob.device-key';
const BIO_SERVICE = 'com.mazahishob.biometric';
const LOCK_KEY = 'mh_app_lock';
const WRAP_KEY = 'mh_backup_wrap';

type LockConfig = {
  enabled: boolean;
  biometric: boolean;
};

const prompt = {
  title: 'माझा हिशोब',
  subtitle: 'अॅप उघडा',
  cancel: 'रद्द',
};

function digitsOnly(pin: string): boolean {
  return /^[0-9]{4,6}$/.test(pin);
}

export async function readLock(): Promise<LockConfig> {
  const stored = await database.localStorage.get<LockConfig>(LOCK_KEY);
  if (!stored?.enabled) {
    return {enabled: false, biometric: false};
  }
  const hasPin = await Keychain.hasGenericPassword({service: PIN_SERVICE});
  if (!hasPin) {
    await database.localStorage.set(LOCK_KEY, {enabled: false, biometric: false});
    return {enabled: false, biometric: false};
  }
  return {enabled: true, biometric: Boolean(stored.biometric)};
}

export async function biometryAvailable(): Promise<boolean> {
  const kind = await Keychain.getSupportedBiometryType();
  return kind != null;
}

export async function enableLock(pin: string): Promise<void> {
  if (!digitsOnly(pin)) {
    throw new Error('पिन ४ ते ६ अंकी हवा');
  }
  await Keychain.setGenericPassword('owner', serializePinHash(hashPin(pin)), {
    service: PIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await rememberWrap(pin);
  await database.localStorage.set(LOCK_KEY, {enabled: true, biometric: false});
}

export async function changeLockPin(current: string, next: string): Promise<void> {
  if (!digitsOnly(next)) {
    throw new Error('नवीन पिन ४ ते ६ अंकी हवा');
  }
  if (!(await unlockWithPin(current))) {
    throw new Error('सध्याचा पिन चुकीचा आहे');
  }
  await Keychain.setGenericPassword('owner', serializePinHash(hashPin(next)), {
    service: PIN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  await rememberWrap(next);
}

export async function disableLock(pin: string): Promise<void> {
  if (!(await unlockWithPin(pin))) {
    throw new Error('पिन चुकीचा आहे');
  }
  await Keychain.resetGenericPassword({service: PIN_SERVICE});
  await Keychain.resetGenericPassword({service: BIO_SERVICE});
  await database.localStorage.remove(WRAP_KEY);
  await database.localStorage.set(LOCK_KEY, {enabled: false, biometric: false});
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  const status = await readLock();
  if (!status.enabled) {
    throw new Error('आधी पिन सेट करा');
  }
  if (!enabled) {
    await Keychain.resetGenericPassword({service: BIO_SERVICE});
    await database.localStorage.set(LOCK_KEY, {enabled: true, biometric: false});
    return;
  }
  if (!(await biometryAvailable())) {
    throw new Error('या फोनवर बोटाचा ठसा उपलब्ध नाही');
  }
  const saved = await Keychain.setGenericPassword('owner', 'unlock', {
    service: BIO_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    authenticationPrompt: {...prompt, subtitle: 'बोटाचा ठसा सेट करा'},
  });
  if (!saved) {
    throw new Error('बोटाचा ठसा सेट झाला नाही');
  }
  await database.localStorage.set(LOCK_KEY, {enabled: true, biometric: true});
}

export async function unlockWithPin(pin: string): Promise<boolean> {
  const stored = await Keychain.getGenericPassword({service: PIN_SERVICE});
  if (!stored) {
    return false;
  }
  const parsed = parsePinHash(stored.password);
  return parsed != null && verifyPin(pin, parsed);
}

export async function unlockWithBiometric(): Promise<boolean> {
  const status = await readLock();
  if (!status.biometric) {
    return false;
  }
  const stored = await Keychain.getGenericPassword({
    service: BIO_SERVICE,
    authenticationPrompt: prompt,
  });
  return stored !== false;
}

export async function sealBackupText(json: string): Promise<string> {
  const {sealSnapshot} = await import('./envelope');
  const key = await getOrCreateDeviceKey();
  const wrapped = (await database.localStorage.get<WrappedKey>(WRAP_KEY)) ?? null;
  return sealSnapshot(json, key, wrapped);
}

export async function openBackupText(payload: string, pin?: string): Promise<string> {
  const {openSnapshot} = await import('./envelope');
  return openSnapshot(payload, await readDeviceKey(), pin ?? null);
}

async function rememberWrap(pin: string): Promise<void> {
  const key = await getOrCreateDeviceKey();
  await database.localStorage.set(WRAP_KEY, wrapKey(key, pin));
}

async function readDeviceKey(): Promise<Uint8Array | null> {
  const stored = await Keychain.getGenericPassword({service: KEY_SERVICE});
  if (!stored) {
    return null;
  }
  const {hexToBytes} = await import('@noble/hashes/utils.js');
  return hexToBytes(stored.password);
}

async function getOrCreateDeviceKey(): Promise<Uint8Array> {
  const existing = await readDeviceKey();
  if (existing) {
    return existing;
  }
  const {randomBytes} = await import('@noble/ciphers/utils.js');
  const {bytesToHex} = await import('@noble/hashes/utils.js');
  const key = randomBytes(32);
  const saved = await Keychain.setGenericPassword('device', bytesToHex(key), {
    service: KEY_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  if (!saved) {
    throw new Error('बॅकअप किल्ली साठवता आली नाही');
  }
  return key;
}
