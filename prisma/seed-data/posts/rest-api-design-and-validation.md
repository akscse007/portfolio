A good REST API is boring in the best way: predictable URLs, honest status codes, strict validation and errors a client can act on. This note collects the conventions that matter most when you are building your first production backend.

## Resources, not actions

Model nouns as collections and items, and let HTTP methods supply the verbs:

| Method | Path | Meaning |
| --- | --- | --- |
| `GET` | `/books` | list (paginated) |
| `POST` | `/books` | create |
| `GET` | `/books/:id` | read one |
| `PATCH` | `/books/:id` | partial update |
| `DELETE` | `/books/:id` | delete |

Avoid paths like `/getBooks` or `/deleteBook?id=3`. Nest only for genuine ownership (`/orders/:id/items`), and keep nesting shallow.

## Status codes are part of the contract

- `200 OK`, `201 Created` (with the new resource), `204 No Content`.
- `400 Bad Request` for malformed or invalid input.
- `401 Unauthorized` when the caller is not authenticated; `403 Forbidden` when they are but may not do this.
- `404 Not Found` — also use it to avoid revealing that a private resource exists.
- `409 Conflict` for uniqueness violations or version conflicts.
- `422 Unprocessable Content` when the syntax is fine but a business rule fails.
- `429 Too Many Requests` with a `Retry-After` header.

## Validate at the boundary

Never trust input — not from forms, not from your own frontend. Validate shape, types, lengths and formats *before* touching the database, and reject unknown fields.

```ts
import { z } from 'zod';

export const createBook = z.object({
  title: z.string().trim().min(1).max(200),
  isbn: z.string().regex(/^97[89]\d{10}$/, 'ISBN-13 expected'),
  priceInPaise: z.number().int().positive(),
  stock: z.number().int().min(0).default(0),
}).strict();

export async function POST(req: Request) {
  const parsed = createBook.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 },
    );
  }
  // ... parsed.data is now fully typed and trusted
}
```

> [!IMPORTANT]
> Store money as integers in the smallest unit (paise, cents). Floating-point arithmetic will eventually produce a bill for ₹99.99999.

## Errors clients can use

Return a consistent error envelope with a human message and machine-readable details:

```json
{
  "error": "Validation failed",
  "details": [{ "path": "isbn", "message": "ISBN-13 expected" }]
}
```

Never leak stack traces or SQL errors to clients; log them server-side with a request ID instead.

## Pagination, filtering and sorting

Use query parameters: `GET /books?limit=20&cursor=eyJpZCI6...&sort=-createdAt&author=tagore`. Cursor pagination stays fast and consistent on large, changing tables where `OFFSET` pagination becomes slow and skips rows.

## Idempotency and safety

`GET`, `PUT` and `DELETE` should be idempotent: repeating them has the same effect as doing them once. For `POST` operations that must not run twice — payments, orders — accept an `Idempotency-Key` header and store the result of the first request.

## Security checklist

1. Authenticate every non-public route and **authorise every object access** server-side.
2. Use parameterised queries or an ORM; never build SQL with string concatenation.
3. Rate-limit authentication and expensive endpoints.
4. Set strict CORS — only the origins you serve.
5. Protect cookie-authenticated mutations against CSRF (same-site cookies plus a token or origin check).
6. Validate uploaded files by content, not by extension.

## Version deliberately

Additive changes (new optional fields) do not need a new version. Breaking changes do — use `/v2/` or a header, and keep the old version alive long enough for clients to migrate.
