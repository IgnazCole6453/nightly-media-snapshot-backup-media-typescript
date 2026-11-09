import assert from "node:assert/strict";
import test from "node:test";

import { snapshotRequestSchema, validateReferences } from "../src/media_snapshot.ts";

test("rejects a delivery that is not tied to an ingested asset", () => {
  const input = snapshotRequestSchema.parse({
    snapshotDate: "2026-09-11",
    assets: [{
      assetId: "asset-101",
      mediaType: "video",
      sourceKey: "ingest/asset-101.mov",
      consentReference: "consent-77",
    }],
    processingJobs: [{ jobId: "job-55", assetId: "asset-101", status: "completed" }],
    creatorDeliveries: [{
      deliveryId: "delivery-9",
      assetId: "asset-unknown",
      creatorId: "creator-4",
      deliveredAt: "2026-09-11T21:00:00.000Z",
    }],
  });

  assert.throws(() => validateReferences(input), /must reference an asset/);
});
