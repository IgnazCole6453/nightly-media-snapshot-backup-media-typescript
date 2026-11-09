import { createHash } from "node:crypto";
import { z } from "zod";

import { infrai } from "./infrai_storage.ts";

export const snapshotRequestSchema = z.object({
  snapshotDate: z.string().date(),
  assets: z.array(z.object({
    assetId: z.string().min(1),
    mediaType: z.enum(["audio", "video"]),
    sourceKey: z.string().min(1),
    consentReference: z.string().min(1),
  })),
  processingJobs: z.array(z.object({
    jobId: z.string().min(1),
    assetId: z.string().min(1),
    status: z.enum(["queued", "processing", "completed", "failed"]),
  })),
  creatorDeliveries: z.array(z.object({
    deliveryId: z.string().min(1),
    assetId: z.string().min(1),
    creatorId: z.string().min(1),
    deliveredAt: z.string().datetime(),
  })),
}).strict();

export type SnapshotRequest = z.infer<typeof snapshotRequestSchema>;

export function snapshotKey(snapshotDate: string): string {
  return `nightly/${snapshotDate}/media-manifest.json`;
}

export function validateReferences(input: SnapshotRequest): void {
  const assetIds = new Set(input.assets.map((asset) => asset.assetId));
  const orphanJob = input.processingJobs.find((job) => !assetIds.has(job.assetId));
  const orphanDelivery = input.creatorDeliveries.find((delivery) => !assetIds.has(delivery.assetId));
  if (orphanJob || orphanDelivery) {
    throw new Error("Every job and delivery must reference an asset in this snapshot");
  }
}

export async function storeNightlySnapshot(bucket: string, input: SnapshotRequest) {
  validateReferences(input);
  const key = snapshotKey(input.snapshotDate);
  const existing = await infrai.storage.object.head(bucket, key);
  if (existing.found) return { state: "unchanged" as const, bucket, key };

  const payload = JSON.stringify(input);
  const digest = createHash("sha256").update(payload).digest("hex");
  const signed = await infrai.storage.object.presign(bucket, key, `snapshot-${input.snapshotDate}-${digest}`);
  const upload = await fetch(signed.url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  if (!upload.ok) throw new Error(`Snapshot upload was rejected (${upload.status})`);

  return { state: "created" as const, bucket, key, sha256: digest };
}
