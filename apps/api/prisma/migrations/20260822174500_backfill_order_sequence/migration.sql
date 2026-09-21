-- Seed OrderSequence from the highest existing order number in each year, so the
-- first sequence-generated number continues where the old count()-based scheme
-- left off instead of colliding with an order that already exists.
INSERT INTO "OrderSequence" ("year", "lastValue", "updatedAt")
SELECT
  split_part("orderNumber", '-', 2)::int          AS "year",
  MAX(split_part("orderNumber", '-', 3)::int)     AS "lastValue",
  NOW()                                           AS "updatedAt"
FROM "Order"
WHERE "orderNumber" ~ '^DRK-[0-9]{4}-[0-9]+$'
GROUP BY 1
ON CONFLICT ("year") DO NOTHING;
