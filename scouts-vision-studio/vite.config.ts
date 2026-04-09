// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import dns from "node:dns";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import { groupLeaderN8nWorkflowPlugin } from "./vite.group-leader-n8n-plugin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Windows: undici fetch often fails with "fetch failed" on dual-stack DNS; prefer IPv4.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* older Node */
}

function groqTlsVerify(): boolean {
  // Dev-only middleware: default no verify (Windows AV / HTTPS inspection). npm run dev uses --use-system-ca.
  // Set GROQ_SSL_STRICT=1 to enforce TLS verification against Node's CA bundle.
  return process.env.GROQ_SSL_STRICT === "1";
}

/** Groq via node:https — more reliable than fetch/undici on some Windows setups. */
function groqHttpsChatCompletion(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<{ statusCode: number; text: string }> {
  const body = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.groq.com",
        port: 443,
        path: "/openai/v1/chat/completions",
        method: "POST",
        servername: "api.groq.com",
        rejectUnauthorized: groqTlsVerify(),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (c) => chunks.push(c));
        incoming.on("end", () => {
          resolve({
            statusCode: incoming.statusCode ?? 0,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(120_000, () => {
      req.destroy(new Error("Groq HTTPS timeout (120s)"));
    });
    req.write(body);
    req.end();
  });
}

function loadGroqKeyFromScoutbuddyEnv(): string {
  let groqKey = process.env.GROQ_API_KEY?.trim() ?? "";
  const envPath = path.join(__dirname, "scoutbuddy", ".env");
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim();
      if (k === "GROQ_API_KEY" && v) groqKey = v;
      if (k === "ANTHROPIC_API_KEY" && v.startsWith("gsk_")) groqKey = v;
    }
  } catch {
    /* no .env */
  }
  return groqKey;
}

function qaAssistanceGroqDevPlugin(): Plugin {
  return {
    name: "qa-assistance-groq-dev",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        if (req.method !== "POST" || pathname !== "/api/scoutbuddy/chat") {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          void (async () => {
            try {
              const raw = Buffer.concat(chunks).toString("utf8");
              const body = JSON.parse(raw || "{}") as { message?: string };
              const userMessage = (body.message ?? "").trim();
              if (!userMessage) {
                res.statusCode = 400;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Empty message" }));
                return;
              }
              const groqKey = loadGroqKeyFromScoutbuddyEnv();
              if (!groqKey) {
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    user_message: userMessage,
                    bot_response:
                      "Add GROQ_API_KEY (or a gsk_ key) in scoutbuddy/.env, then restart npm run dev.",
                  }),
                );
                return;
              }
              const promptPath = path.join(__dirname, "scoutbuddy", "system_prompt.txt");
              let systemPrompt: string;
              try {
                systemPrompt = fs.readFileSync(promptPath, "utf8").trim();
              } catch {
                systemPrompt =
                  'You are "Q&A Assistance", a scouting helper. Answer in the user\'s language, simply and directly.';
              }
              const userBlock =
                "Here is the question. Answer it directly and exactly (scouting topics only). " +
                "Do not answer a different question.\n\n" +
                userMessage;
              const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userBlock },
              ];
              const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
              let botResponse = "";
              let lastErr = "";
              for (const model of models) {
                const { statusCode, text } = await groqHttpsChatCompletion(groqKey, {
                  model,
                  messages,
                  max_tokens: 1200,
                  temperature: 0.4,
                });
                if (statusCode === 401) {
                  botResponse =
                    "Groq rejected the API key. Open scoutbuddy/.env and set a valid GROQ_API_KEY from console.groq.com.";
                  break;
                }
                if (statusCode < 200 || statusCode >= 300) {
                  lastErr = text.slice(0, 400);
                  continue;
                }
                let data: { choices?: Array<{ message?: { content?: string } }> };
                try {
                  data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
                } catch {
                  lastErr = text.slice(0, 400);
                  continue;
                }
                botResponse = (data.choices?.[0]?.message?.content ?? "").trim();
                if (botResponse) break;
              }
              if (!botResponse) {
                botResponse =
                  lastErr ||
                  "No reply from Groq. Check internet / firewall. If HTTPS is inspected, set GROQ_SSL_VERIFY=0 in Windows environment variables and restart the terminal (less secure).";
              }
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ user_message: userMessage, bot_response: botResponse }));
            } catch (e) {
              const err = e instanceof Error ? e : new Error(String(e));
              const cause = err.cause instanceof Error ? ` (${err.cause.message})` : "";
              const msg = `${err.message}${cause}`;
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  user_message: "",
                  bot_response: `Chat error: ${msg}`,
                }),
              );
            }
          })();
        });
      });
    },
  };
}

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [qaAssistanceGroqDevPlugin(), groupLeaderN8nWorkflowPlugin()],
    server: {
      proxy: {
        "/api/ml": {
          target: "http://127.0.0.1:5050",
          changeOrigin: true,
          rewrite: (path) => {
            const stripped = path.replace(/^\/api\/ml/, "");
            return stripped.length > 0 ? stripped : "/";
          },
        },
        // /api/scoutbuddy/chat: handled only by qaAssistanceGroqDevPlugin (Node https → Groq). Do not proxy to Flask in dev.
      },
    },
  },
});
