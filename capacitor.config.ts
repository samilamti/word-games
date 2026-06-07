import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.samixavierlamti.lexiconquest',
  appName: 'Lexica Knights',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    scrollEnabled: false,
    backgroundColor: '#0d0d1a',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: '#0d0d1a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0d0d1a',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
