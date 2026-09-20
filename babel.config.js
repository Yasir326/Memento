module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/plugin MUST be last per Reanimated docs.
      // Required so the animated props on <AnimatedCircle> in LifeGrid work.
      'react-native-reanimated/plugin',
    ],
  };
};
