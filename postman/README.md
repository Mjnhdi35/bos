# BOS API - Postman Tests

End-to-end HTTP test collection for the BOS API.

## Files

- `bos.postman_collection.json` - request + test scripts (Postman v2.1.0)
- `bos.postman_environment.json` - local dev environment (`baseUrl`, runtime vars)

## Import into Postman

1. Open Postman, click `Import` (top-left).
2. Drop both files in the dialog (or upload them).
3. Select the `BOS API - Local` environment in the top-right environment dropdown.

## Run from Postman app

- Open the `BOS API` collection, click `Runner` at the bottom.
- Pick the environment, click `Run BOS API`.
- Each request captures `access_token`, `refresh_token`, `product_id` from
  responses and reuses them in later requests via `pm.environment.set`.

## Run from CLI with newman

```bash
npm install -D newman
npm run test:postman
```

The script runs the collection against `http://localhost:3000` by default.
Override with `--env-var baseUrl=...` if needed.

## State assumptions

- The collection registers a fresh user each run (`test_email` = `bos+<ts>@example.com`),
  so it is safe to run repeatedly against the same database.
- The `Platform - Data` flow registers a `products` entity, inserts one record,
  updates it, deletes it, then drops the entity. If the collection is aborted
  mid-run, you may need to manually `DELETE /platform/entities/products/v/1`.