module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // WatermelonDB models use legacy decorators. This plugin must stay first.
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    // Zod 4's ESM build uses `export * as`, which the RN preset does not rewrite.
    '@babel/plugin-transform-export-namespace-from',
  ],
};
