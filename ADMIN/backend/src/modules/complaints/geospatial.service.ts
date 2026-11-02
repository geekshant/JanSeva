import { prisma } from '../../db/prisma';

/**
 * Queries that rely on the PostGIS geography column. These use $queryRaw
 * since Prisma cannot filter on Unsupported("geography") types directly.
 * Placeholder indices are built dynamically so no unused parameter is ever
 * bound to PostgreSQL.
 */

interface NearComplaintRow {
  id: string;
  tracking_code: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  address: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  created_at: Date;
}

export interface NearbyComplaint {
  id: string;
  trackingCode: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  createdAt: Date;
}

function toNearbyComplaint(row: NearComplaintRow): NearbyComplaint {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    title: row.title,
    category: row.category,
    status: row.status,
    priority: row.priority,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    distanceMeters: row.distance_meters,
    createdAt: row.created_at,
  };
}

export async function findNearbyComplaints(input: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit: number;
  status?: string;
  category?: string;
}): Promise<NearbyComplaint[]> {
  const values: unknown[] = [input.latitude, input.longitude, input.radiusKm];
  const filters: string[] = [];

  if (input.status) {
    values.push(input.status);
    filters.push(`AND status = $${values.length}::"public"."ComplaintStatus"`);
  }
  if (input.category) {
    values.push(input.category);
    filters.push(`AND category = $${values.length}`);
  }
  values.push(input.limit);

  return prisma.$queryRawUnsafe<NearComplaintRow[]>(
    `
    SELECT
      id,
      "trackingCode" AS tracking_code,
      title,
      category,
      status,
      priority,
      address,
      latitude,
      longitude,
      ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      ) AS distance_meters,
      "createdAt" AS created_at
    FROM "public"."complaints"
    WHERE "deletedAt" IS NULL
      AND location IS NOT NULL
      AND ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3 * 1000
      )
      ${filters.join(' ')}
    ORDER BY distance_meters ASC
    LIMIT $${values.length}
    `,
    ...values,
  ).then((rows) => rows.map(toNearbyComplaint));
}

interface MapComplaintRow {
  id: string;
  tracking_code: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  latitude: number;
  longitude: number;
  created_at: Date;
}

export interface BoundsComplaint {
  id: string;
  trackingCode: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

function toBoundsComplaint(row: MapComplaintRow): BoundsComplaint {
  return {
    id: row.id,
    trackingCode: row.tracking_code,
    title: row.title,
    category: row.category,
    status: row.status,
    priority: row.priority,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };
}

/** Fetch complaints inside a map viewport following GeoJSON-style ordering. */
export async function findComplaintsInBounds(input: {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
  status?: string;
  category?: string;
  limit: number;
}): Promise<BoundsComplaint[]> {
  const values: unknown[] = [input.neLat, input.swLat, input.neLng, input.swLng];
  const filters: string[] = [];

  if (input.status) {
    values.push(input.status);
    filters.push(`AND status = $${values.length}::"public"."ComplaintStatus"`);
  }
  if (input.category) {
    values.push(input.category);
    filters.push(`AND category = $${values.length}`);
  }
  values.push(input.limit);

  return prisma.$queryRawUnsafe<MapComplaintRow[]>(
    `
    SELECT
      id,
      "trackingCode" AS tracking_code,
      title,
      category,
      status,
      priority,
      latitude,
      longitude,
      "createdAt" AS created_at
    FROM "public"."complaints"
    WHERE "deletedAt" IS NULL
      AND latitude BETWEEN $2 AND $1
      AND longitude BETWEEN $4 AND $3
      ${filters.join(' ')}
    ORDER BY "createdAt" DESC
    LIMIT $${values.length}
    `,
    ...values,
  ).then((rows) => rows.map(toBoundsComplaint));
}

export interface ClusterRow {
  cell: string;
  count: number;
  centerLat: number;
  centerLng: number;
}

/** Group complaints into grid cells for heatmap / clustering visualisations. */
export async function clusterComplaints(input: {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
  gridSize: number;
}): Promise<ClusterRow[]> {
  return prisma.$queryRaw<ClusterRow[]>`
    SELECT
      CONCAT(
        FLOOR(latitude / ${input.gridSize}), ':',
        FLOOR(longitude / ${input.gridSize})
      ) AS cell,
      COUNT(*)::int AS count,
      AVG(latitude) AS "centerLat",
      AVG(longitude) AS "centerLng"
    FROM "public"."complaints"
    WHERE "deletedAt" IS NULL
      AND latitude BETWEEN ${input.swLat} AND ${input.neLat}
      AND longitude BETWEEN ${input.swLng} AND ${input.neLng}
    GROUP BY cell
  `;
}