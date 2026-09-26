import { build } from "esbuild";

await build({ entryPoints: ["react-client.js"], outfile: "static/react-client.js", bundle: true, format: "esm", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } });
