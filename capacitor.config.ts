
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2e33e62ed4d24f1badf5a399d3ab359c',
  appName: 'vibe-tick-spots-world',
  webDir: 'dist',
  server: {
    url: 'https://2e33e62e-d4d2-4f1b-adf5-a399d3ab359c.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#ffffff",
      showSpinner: false
    },
    ScreenOrientation: {
      allowOrientationChange: false,
      orientation: "portrait"
    }
  }
};

export default config;
