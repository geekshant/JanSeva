import { prisma } from '../../db/prisma';

export interface NearestIdRow {
  id: string;
  distance_meters: number | null;
}

/**
 * Fetch complaint ids ordered by distance from a point using the PostGIS
 * geography column, with skip/take applied in SQL.
 */
export async function nearestOrderRawRows(input: {
  latitude: number;
  longitude: number;
  skip: number;
  take: number;
  /**
   * Optional status filter. One placeholder is emitted per value so each is
   * bound as a scalar enum — binding the whole `{ in: [...] }` filter object
   * here made Postgres reject the parameter.
   */
  statuses?: string[];
}): Promise<NearestIdRow[]> {
  const values: unknown[] = [input.latitude, input.longitude, input.skip, input.take];
  const filters: string[] = [];

  if (input.statuses?.length) {
    const placeholders = input.statuses.map((status) => {
      values.push(status);
      return `$${values.length}::"public"."ComplaintStatus"`;
    });
    filters.push(`AND status IN (${placeholders.join(', ')})`);
  }

  return prisma.$queryRawUnsafe<NearestIdRow[]>(
    `
    SELECT
      id,
      ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
      ) AS distance_meters
    FROM "public"."complaints"
    WHERE "deletedAt" IS NULL
      AND location IS NOT NULL
      ${filters.join(' ')}
    ORDER BY distance_meters ASC
    OFFSET $3
    LIMIT $4
    `,
    ...values,
  );
}