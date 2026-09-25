/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => undefined),
  fetch: jest.fn(async () => ({isConnected: true})),
}));

jest.mock('react-native-blob-util', () => ({
  fs: {
    dirs: {DocumentDir: '/tmp'},
    exists: jest.fn(async () => true),
    mkdir: jest.fn(async () => undefined),
    writeFile: jest.fn(async () => undefined),
    readFile: jest.fn(async () => ''),
    ls: jest.fn(async () => []),
  },
}));

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when'},
  ACCESS_CONTROL: {BIOMETRY_CURRENT_SET: 'bio'},
  setGenericPassword: jest.fn(async () => ({service: 'test'})),
  getGenericPassword: jest.fn(async () => false),
  hasGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
  getSupportedBiometryType: jest.fn(async () => null),
}));

import App from '../App';

jest.mock('../src/db', () => ({
  database: {},
  prepareDatabase: jest.fn().mockResolvedValue(undefined),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });
});
