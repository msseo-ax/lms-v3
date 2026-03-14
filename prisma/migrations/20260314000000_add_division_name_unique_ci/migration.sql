-- Case-insensitive unique index on division name
CREATE UNIQUE INDEX "divisions_name_lower_unique" ON "divisions" (lower("name"));
