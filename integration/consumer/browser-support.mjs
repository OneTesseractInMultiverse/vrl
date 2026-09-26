import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";

export async function startApplication() {
  const port = await availablePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["build/index.js"], { env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), ORIGIN: origin }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const record = chunk => { output = (output + chunk).slice(-20_000); };
  server.stdout.on("data", record); server.stderr.on("data", record);
  const stop = async () => {
    if (server.exitCode !== null || server.signalCode !== null) return;
    const exited = new Promise(resolve => server.once("exit", resolve));
    server.kill("SIGTERM");
    const timer = globalThis.setTimeout(() => server.kill("SIGKILL"), 5_000);
    try { await exited; } finally { clearTimeout(timer); }
  };
  try {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (server.exitCode !== null || server.signalCode !== null) throw new Error(`Consumer server exited:\n${output}`);
      try { if ((await fetch(origin, { signal: AbortSignal.timeout(1_000) })).ok) return { origin, stop }; } catch { /* Wait for the owned local process. */ }
      await setTimeout(50);
    }
    throw new Error(`Consumer server did not start:\n${output}`);
  } catch (error) { await stop(); throw error; }
}

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close(error => error ? reject(error) : resolve(port)); });
  });
}

export async function openPage(browser, origin, surface, name, hydrated) {
  const context = await browser.newContext({ javaScriptEnabled: hydrated, serviceWorkers: "block" });
  const errors = [];
  await context.route("**/*", route => {
    if (new URL(route.request().url()).origin !== origin) { errors.push(`External request: ${route.request().url()}`); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" || /hydration|mismatch/i.test(message.text())) errors.push(message.text()); });
  const path = surface === "react" ? "/react" : "/";
  try {
    await page.goto(`${origin}${path}?surface=${surface}&case=${name}`);
    if (hydrated) await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true");
    return { page, errors, close: () => context.close() };
  } catch (error) { await context.close(); throw error; }
}

export async function snapshot(page) {
  return page.evaluate(() => ({
    svg: document.querySelectorAll("#diagram svg").length,
    title: document.querySelector("#diagram svg title")?.textContent ?? null,
    warning: document.querySelector('#diagram [role="status"]')?.textContent ?? "",
    diagnostics: [...document.querySelectorAll('#diagram pre:not([role="status"])')].map(element => element.textContent)
  }));
}
