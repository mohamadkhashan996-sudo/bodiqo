import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Relune native shells load the production web app (custom Node + Socket.IO).
 * Set CAPACITOR_SERVER_URL before `npx cap sync`.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL || "https://localhost:3000";

const config: CapacitorConfig = {
  appId: "app.relune.social",
  appName: "Relune",
  webDir: "mobile/www",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: [
      "localhost",
      "127.0.0.1",
      "*.relune.app",
      "*.relune.social",
    ],
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "Relune",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#F4F2EE",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#F4F2EE",
      showSpinner: false,
    },
  },
};

export default config;
