A query that takes 2 ms on your laptop can take 20 seconds in production once the table has ten million rows. The difference is almost always an index — or the lack of one. This note explains what an index is, how the database decides to use it, and how to find slow queries.

## What an index is

Without an index, finding rows that match `WHERE email = 'a@b.com'` means reading every row — a **sequential scan**, cost $O(n)$. A B-tree index keeps the column's values sorted in a balanced tree, so a lookup costs $O(\log n)$ page reads. For ten million rows, that is roughly 24 comparisons instead of ten million.

```sql
CREATE INDEX idx_users_email ON users (email);
-- or, enforcing uniqueness at the same time:
CREATE UNIQUE INDEX uq_users_email ON users (email);
```

## Reading a query plan

Always ask the database what it intends to do:

```sql
EXPLAIN ANALYZE
SELECT id, title FROM posts
WHERE status = 'PUBLISHED'
ORDER BY published_at DESC
LIMIT 10;
```

Look for `Seq Scan` on large tables, large differences between *estimated* and *actual* rows (stale statistics — run `ANALYZE`), and expensive `Sort` steps that an index could have provided for free.

## Composite indexes and column order

An index on `(status, published_at)` serves queries that filter on `status` and sort by `published_at` — the plan above becomes an index scan that stops after 10 rows. Column order matters: the index is sorted by the first column, then the second within it.

| Query | Uses `(status, published_at)`? |
| --- | --- |
| `WHERE status = ?` | yes |
| `WHERE status = ? ORDER BY published_at` | yes, no sort needed |
| `WHERE published_at > ?` | not efficiently |

> [!TIP]
> Put equality-filtered columns first and range or sort columns last.

## Indexes are not free

Every index must be updated on each `INSERT`, `UPDATE` and `DELETE`, and it consumes memory and disk. Index the columns your real queries filter, join and sort on — not every column "just in case". Remove indexes that the statistics show are never used.

## Common reasons an index is ignored

1. **Functions on the column**: `WHERE lower(email) = ?` cannot use an index on `email`. Create an expression index on `lower(email)` instead.
2. **Leading wildcards**: `LIKE '%son'` cannot use a B-tree. Consider a trigram index for substring search.
3. **Low selectivity**: if a condition matches most of the table, scanning is genuinely cheaper.
4. **Type mismatches**: comparing a text column with a number forces a cast on every row.

## The N+1 query problem

ORMs make it easy to write a loop that issues one query per row:

```ts
const posts = await db.post.findMany();
for (const p of posts) {
  p.author = await db.user.findUnique({ where: { id: p.authorId } }); // N extra queries
}
```

Fetch related data in one round trip instead (`include`, a join, or `WHERE id IN (...)`). With 100 posts, that is 2 queries instead of 101.

## A practical workflow

1. Enable slow-query logging (or `pg_stat_statements` in PostgreSQL).
2. Pick the queries with the highest *total* time, not just the slowest single run.
3. `EXPLAIN ANALYZE` them, add or adjust one index, and measure again.
4. Re-check write performance after adding indexes.

Indexing is the highest-leverage performance skill a backend developer can learn: a single well-chosen line of DDL often beats a week of application-level caching.
