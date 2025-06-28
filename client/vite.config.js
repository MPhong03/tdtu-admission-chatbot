import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // host: true,
    port: 5174,
    // allowedHosts: ["0f28-14-161-73-175.ngrok-free.app"],
  },
  base: '/tdtu-admission-chatbot/'
});
