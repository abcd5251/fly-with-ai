import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: { port: 8080, strictPort: true, host: true },
  resolve: {
    // React and the router must resolve to one copy each, or hooks break.
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    // Redirect TanStack Start's bundled server entry to src/server.ts.
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    nitro(),
  ],
});
