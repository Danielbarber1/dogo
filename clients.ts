import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { Expo } from 'expo-server-sdk';

export const prisma = new PrismaClient();
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
export const expo = new Expo();
