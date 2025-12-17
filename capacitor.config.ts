import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.francesco.vibetickspots',
  appName: 'vibe-tick-spots-world',
  webDir: 'dist',
  // No server.url here – use bundled assets instead of remote Lovable URL
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false
    }
  }
};

export default config;

