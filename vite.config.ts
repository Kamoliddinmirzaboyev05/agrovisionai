import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import { dirname } from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function figmaAssetResolver() {
  return {
    name: "figma-asset-resolver",
    resolveId(id: string) {
      if (id.startsWith("figma:asset/")) {
        const filename = id.replace("figma:asset/", "");
        return dirname(__dirname) + "/src/assets/" + filename;
      }
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      // Alias @ to the src directory
      "@": __dirname + "/src",
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ["**/*.svg", "**/*.csv"],

  server: {
    host: true, // Listen on all addresses
    port: 3000,
    strictPort: false, // Allows 3001, 3002 if 3000 is occupied
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
        // Django checks the Origin header for CSRF protection.
        // During development, we can spoof it to match the target.
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const origin = req.headers.origin;
            if (origin) {
              proxyReq.setHeader('Origin', 'http://127.0.0.1:8000');
              proxyReq.setHeader('Referer', 'http://127.0.0.1:8000/');
            }
          });
        },
      },
    },
    // Removed fixed HMR port to let Vite handle it automatically based on server port
    hmr: {
      overlay: true,
    },
    // Optimizing for development speed and preventing some caching issues
    watch: {
      usePolling: true,
    },
  },
  optimizeDeps: {
    force: true, // Forces dependency pre-bundling on every start
  },
});
