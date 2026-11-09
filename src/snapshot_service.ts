import { createServer } from "node:http";
import { ZodError } from "zod";

import { InfraiError, infrai } from "./infrai_storage.ts";
import { snapshotRequestSchema, storeNightlySnapshot } from "./media_snapshot.ts";

const bucket = process.env.MEDIA_SNAPSHOT_BUCKET ?? "private-media-snapshots";
const port = Number(process.env.PORT ?? 3000);

await infrai.storage.bucket.create(bucket);

const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.method !== "POST" || request.url !== "/snapshots/nightly") {
    response.writeHead(404).end(JSON.stringify({ error: "route_not_found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = snapshotRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await storeNightlySnapshot(bucket, input);
    response.writeHead(result.state === "created" ? 201 : 200).end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      response.writeHead(400).end(JSON.stringify({ error: "invalid_snapshot", details: error.message }));
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.writeHead(status).end(JSON.stringify({ error: error.code, message: error.message }));
      return;
    }
    response.writeHead(500).end(JSON.stringify({ error: "snapshot_failed" }));
  }
});

server.listen(port, () => {
  console.log(`Nightly snapshot service listening on http://localhost:${port}`);
});
