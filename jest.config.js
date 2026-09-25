module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|@noble|react-native-url-polyfill|react-native-keychain|react-native-blob-util|@supabase)/)',
  ],
};
