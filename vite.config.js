import { defineConfig } from "vite";

import million from "million/compiler";
import react from "@vitejs/plugin-react-swc";
import unocss from "unocss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 3000 },
  plugins: [million.vite({ auto: true, mute: true }), react(), unocss()],
  css: { devSourcemap: true },
  build: { cssMinify: "lightningcss" },
});
