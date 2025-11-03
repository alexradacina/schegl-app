import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.schlegl.app",
  appName: "Schlegl App",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  ios: {
    webView: {
      backgroundColor: "transparent",
      transparentBackground: true
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
}

export default config
