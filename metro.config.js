const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    // WatermelonDB models use legacy decorators, which the Hermes parser rejects.
    hermesParser: false,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
