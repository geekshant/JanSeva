-- Enable PostGIS extension (idempotent).
CREATE EXTENSION IF NOT EXISTS postgis;

-- Geography column kept in sync with latitude/longitude by the trigger below.
ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

-- Spatial index for location-based queries (nearby, map bounds, radius).
CREATE INDEX IF NOT EXISTS "complaints_location_gist" ON "complaints" USING GIST ("location");

-- Backfill existing rows.
UPDATE "complaints"
SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
WHERE "location" IS NULL
  AND "latitude" IS NOT NULL
  AND "longitude" IS NOT NULL;

-- Trigger function: keep the geography column in sync on insert/update.
CREATE OR REPLACE FUNCTION sync_complaint_location() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."latitude" IS NOT NULL AND NEW."longitude" IS NOT NULL THEN
    NEW."location" = ST_SetSRID(ST_MakePoint(NEW."longitude", NEW."latitude"), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_complaints_sync_location ON "complaints";
CREATE TRIGGER trg_complaints_sync_location
  BEFORE INSERT OR UPDATE OF "latitude", "longitude" ON "complaints"
  FOR EACH ROW EXECUTE FUNCTION sync_complaint_location();