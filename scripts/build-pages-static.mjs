import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientDirectory = resolve(projectRoot, "dist/client");
const workerEntry = resolve(projectRoot, "dist/server/index.js");
const outputDirectory = resolve(projectRoot, "pages-dist");

const workerModule = await import(
  `${pathToFileURL(workerEntry).href}?pages-static=${Date.now()}`
);

if (!workerModule.default || typeof workerModule.default.fetch !== "function") {
  throw new Error("The built FleetCare Worker does not expose default.fetch().");
}

const environment = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
  IMAGES: {
    input: () => {
      throw new Error("Image transformation is unavailable during static rendering.");
    },
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

const response = await workerModule.default.fetch(
  new Request("https://cospharm-fleetcare.pages.dev/"),
  environment,
  context,
);

if (!response.ok) {
  throw new Error(`Static page rendering failed with HTTP ${response.status}.`);
}

const html = await response.text();
if (!html.startsWith("<!DOCTYPE html>") || !html.includes("Cospharm Vehicle Assessments")) {
  throw new Error("Static page rendering returned unexpected HTML.");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(clientDirectory, outputDirectory, { recursive: true });
await writeFile(resolve(outputDirectory, "index.html"), html, "utf8");

console.log("Prepared Cloudflare Pages output in pages-dist/.");
