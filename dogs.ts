import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/clients';
import { AuthedRequest } from '../middleware/auth';

const query = z.object({
  lat: z.coerce.number(), lng: z.coerce.number(),
  radiusKm: z.coerce.number().min(0.5).max(50).default(5),
  breed: z.string().optional(),
  minEnergy: z.coerce.number().int().min(1).max(5).default(1),
  maxEnergy: z.coerce.number().int().min(1).max(5).default(5),
});

export const dogs = Router();

// GET /api/dogs/match?lat=&lng=&radiusKm=&breed=&minEnergy=&maxEnergy=
dogs.get('/match', async (req, res) => {
  const q = query.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const { lat, lng, radiusKm, breed, minEnergy, maxEnergy } = q.data;
  const me = (req as AuthedRequest).userId;

  // Haversine distance computed in Postgres against each owner's last known location
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT * FROM (
      SELECT d.id, d.name, d.breed, d.age, d.size, d."energyLevel", d."isNeutered", d.tags, d."avatarUrl", d."userId",
        6371 * acos(LEAST(1, cos(radians(${lat})) * cos(radians(u."lastLat")) * cos(radians(u."lastLng") - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(u."lastLat")))) AS "distanceKm"
      FROM "Dog" d JOIN "User" u ON u.id = d."userId"
      WHERE d."userId" <> ${me}::uuid AND u."lastLat" IS NOT NULL
        AND d."energyLevel" BETWEEN ${minEnergy} AND ${maxEnergy}
        ${breed ? Prisma.sql`AND d.breed ILIKE ${breed}` : Prisma.empty}
    ) t WHERE "distanceKm" <= ${radiusKm} ORDER BY "distanceKm" LIMIT 50`);
  res.json(rows);
});
