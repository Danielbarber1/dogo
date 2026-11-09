import { Prisma } from '@prisma/client';
import { Expo } from 'expo-server-sdk';
import { Router } from 'express';
import { z } from 'zod';
import { expo, prisma, supabase } from '../lib/clients';
import { AuthedRequest } from '../middleware/auth';

const RADIUS_KM = 3;
const schema = z.object({ dogId: z.string().uuid(), lat: z.number(), lng: z.number() });
export const sos = Router();

sos.post('/broadcast', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { dogId, lat, lng } = parsed.data;
  const userId = (req as AuthedRequest).userId;
  const dog = await prisma.dog.findFirst({ where: { id: dogId, userId } });
  if (!dog) return res.status(404).json({ error: 'Dog not found' });

  const alert = await prisma.sosAlert.create({ data: { dogId, lastSeenLat: lat, lastSeenLng: lng } });

  const nearby = await prisma.$queryRaw<{ pushToken: string | null }[]>(Prisma.sql`
    SELECT "pushToken" FROM (
      SELECT "pushToken", id, 6371 * acos(LEAST(1, cos(radians(${lat})) * cos(radians("lastLat")) * cos(radians("lastLng") - radians(${lng}))
        + sin(radians(${lat})) * sin(radians("lastLat")))) AS km
      FROM "User" WHERE "lastLat" IS NOT NULL) t
    WHERE km <= ${RADIUS_KM} AND id <> ${userId}::uuid`);

  const payload = { alertId: alert.id, dogName: dog.name, breed: dog.breed, lat, lng, avatarUrl: dog.avatarUrl };
  // 1) Realtime for users with the app open
  await supabase.channel('sos-alerts').send({ type: 'broadcast', event: 'sos', payload });
  // 2) Push for everyone else
  const messages = nearby.map((u) => u.pushToken).filter((t): t is string => !!t && Expo.isExpoPushToken(t))
    .map((to) => ({ to, sound: 'default' as const, priority: 'high' as const,
      title: `🚨 Lost dog nearby: ${dog.name}`, body: `${dog.breed} last seen within ${RADIUS_KM}km of you. Tap to help.`, data: payload }));
  for (const chunk of expo.chunkPushNotifications(messages)) await expo.sendPushNotificationsAsync(chunk);

  res.status(201).json({ alert, notified: messages.length });
});
