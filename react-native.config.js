/** Native modules that fail on current EAS Xcode — excluded until upstream fixes land. */
module.exports = {
  dependencies: {
    'expo-video-processing': {
      platforms: { ios: null, android: null },
    },
  },
};
