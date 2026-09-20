# REST API

Base URL: `http://localhost:4000`

Auth header: `Authorization: Bearer <jwt>`

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | No | `{ email, password }` |
| GET | /api/auth/me | Yes | Current user |

Demo password for all users: `Password123!`

## Batches

| Method | Path | Roles |
|--------|------|-------|
| POST | /api/batches | FARM |
| GET | /api/batches | any authenticated |
| GET | /api/batches/search?q= | any |
| GET | /api/batches/:batchId | any |
| GET | /api/batches/:batchId/history | any |
| POST | /api/batches/:batchId/events | role matching stage |
| GET | /api/batches/:batchId/events | any |
| GET | /api/batches/:batchId/verify | any |
| GET | /api/batches/:batchId/integrity | any |
| POST | /api/batches/:batchId/contaminate | STORE_ADMIN |
| GET | /api/batches/:batchId/recall | any |

## Other

| Method | Path | Auth |
|--------|------|------|
| GET | /api/recalls | Yes |
| GET | /api/dashboard/stats | Yes |
| GET | /api/public/verify/:batchId | No (public QR) |

## Response shape

```json
{ "success": true, "data": {}, "message": "..." }
```

```json
{ "success": false, "error": { "code": "...", "message": "..." } }
```

Fabric transaction IDs are included in submit responses and event objects when available.
