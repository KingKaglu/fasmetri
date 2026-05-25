# ფასმეტრი

Georgian price comparison and deals platform built with Next.js, Prisma, PostgreSQL, and Tailwind CSS.

## Development

```bash
npm install
npm run db:generate
npm run dev
```

## Catalog Jobs

All ingestion and matching jobs are batch-friendly and support flags such as `--limit`, `--offset`, `--shop`, `--category`, `--dry-run`, `--resume`, and `--checkpoint` where relevant.

```bash
npm run ingest:zoommer:full -- --category=mobiles --limit=100 --offset=0
npm run normalize-raw-offers -- --shop=zoommer --category=mobiles --limit=100 --offset=0
npm run match-offers-to-variants -- --shop=zoommer --category=mobiles --limit=100 --offset=0
npm run catalog-coverage
```

## Production Notes

Set `DATABASE_URL` to an active hosted PostgreSQL database before running migrations or ingestion in production.
