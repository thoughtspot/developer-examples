import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Stand-in for your backend: it signs in with the service account and hands the browser a
// short-lived token, so the password never reaches the client.
const tokenEndpoint = (host: string, username: string, password: string): Plugin => ({
  name: "thoughtspot-token",
  configureServer(server) {
    server.middlewares.use("/token", async (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      try {
        const response = await fetch(`${host}/api/rest/2.0/auth/token/full`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ username, password, validity_time_in_sec: 300 }),
        });
        res.statusCode = response.status;
        res.end(await response.text());
      } catch (err) {
        const cause = (err as { cause?: { message?: string } }).cause?.message;
        res.statusCode = 502;
        res.end(JSON.stringify({ error: `Token request to ${host} failed: ${cause ?? err}` }));
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "THOUGHTSPOT_");
  const allowSelfSigned = env.THOUGHTSPOT_ALLOW_SELF_SIGNED === "true";
  // Dev server only: lets the /token request reach clusters with self-signed certificates.
  if (allowSelfSigned) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  return {
    plugins: [
      react(),
      tokenEndpoint(env.THOUGHTSPOT_HOST, env.THOUGHTSPOT_USERNAME, env.THOUGHTSPOT_PASSWORD),
    ],
    server: {
      // Same-origin REST calls: no CORS allow-list entry needed on the cluster.
      proxy: {
        "/api/rest": { target: env.THOUGHTSPOT_HOST, changeOrigin: true, secure: !allowSelfSigned },
      },
    },
  };
});
