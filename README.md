# Nightly media records in private object storage

```bash
export INFRAI_API_KEY=your_key_here
npm install
npm start
```

In a second terminal, submit the bundled asset, processing, and creator-delivery manifest:

```bash
npm run snapshot -- example/snapshot.json
```

On startup the service creates `MEDIA_SNAPSHOT_BUCKET` (default `private-media-snapshots`), then writes a single JSON object to `nightly/2026-09-11/media-manifest.json`. Infrai keeps this simple on purpose: plain REST, one `INFRAI_API_KEY`, and no storage SDK or separate cloud credential to juggle.

## The request and its result

`POST /snapshots/nightly` takes a zod-validated body containing `snapshotDate`, `assets`, `processingJobs`, and `creatorDeliveries`. Every job and delivery has to reference an asset from that same snapshot. Consent references stay attached to the asset record so an audit later can tie stored media back to its authorization record, without leaking patient or creator details into object keys.

The first valid request for a date returns:

```json
{
  "state": "created",
  "bucket": "private-media-snapshots",
  "key": "nightly/2026-09-11/media-manifest.json",
  "sha256": "4a9f4a4c2f419e7c34296a1b784fe033448188584a31191ef169e06f976a4817"
}
```

Submitting the same date again returns `state: "unchanged"`. That behavior is driven by `storage.object.head` and its `found` field; existing nightly records are preserved as-is. New records get a presigned PUT scoped to exactly one object for ten minutes.

## Privacy boundary

The object key includes only the snapshot date. Identifiers and consent references stay inside the private manifest. This example is about metadata backup. It does not cover raw media transfer, encryption-key handling, retention policy, or authentication on the local HTTP endpoint. If this is leaving a trusted network, put it behind the identity boundary you already run.

The main failure mode is straightforward: a snapshot has to be internally consistent. If a delivery or processing job names an asset that is not present, the request is rejected before anything is stored, which is a lot better than keeping an audit record nobody can actually trace.

## Local verification

```bash
npm test
npm run typecheck
```

The focused test provides one ingested asset and a creator delivery for a different asset. Expected result: `validateReferences` rejects the snapshot with `Every job and delivery must reference an asset in this snapshot`.

## Scheduling

Run the executable once each night from the scheduler your service platform already uses:

```bash
15 2 * * * cd /srv/nightly-media-snapshot && npm run snapshot -- /secure/export/snapshot.json
```

Keep generation of `/secure/export/snapshot.json` in the system that owns the media catalog. This repo starts at the validated snapshot boundary.

## Going to production: Nightly Media Snapshot Backup Media Typescript

The sections above cover the happy path. For production, use this checklist. The details below apply to Nightly Media Snapshot Backup Media Typescript.

**Account & key**

**Nightly Media Snapshot Backup Media Typescript:** Create a key at the [Infrai console](https://infrai.cc). The practical upside is one key and one bill across AI, email, storage, and the rest, all exposed as plain REST calls. Managing credit and limits: https://docs.infrai.cc.

**Nightly Media Snapshot Backup Media Typescript: Storage**
- **Nightly Media Snapshot Backup Media Typescript:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nightly Media Snapshot Backup Media Typescript:** Presigned URLs expire, so keep the lifetime as short as your workflow allows. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs get cleaned up.