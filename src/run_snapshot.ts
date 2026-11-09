import { readFile } from "node:fs/promises";

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: npm run snapshot -- <snapshot.json>");

const response = await fetch(`http://localhost:${process.env.PORT ?? 3000}/snapshots/nightly`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: await readFile(inputPath, "utf8"),
});
const result = await response.json();
console.log(JSON.stringify(result, null, 2));
if (!response.ok) process.exitCode = 1;
