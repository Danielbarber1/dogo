import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../lib/api';

type Goal = { id: string; title: string; isCompleted: boolean };
type Playdate = { id: string; title: string; locationName: string; scheduledAt: string };

export default function HomeScreen({ dogId, dogName }: { dogId: string; dogName: string }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [playdates, setPlaydates] = useState<Playdate[]>([]);

  useEffect(() => {
    api<Goal[]>(`/goals?dogId=${dogId}`).then(setGoals).catch(() => {}); // GET /api/goals: not yet implemented
    api<Playdate[]>('/playdates/upcoming').then(setPlaydates).catch(() => {});
  }, [dogId]);

  const done = goals.filter((g) => g.isCompleted).length;
  const pct = goals.length ? Math.round((done / goals.length) * 100) : 0;

  const triggerSos = () =>
    Alert.alert('Lost dog alert?', `Notify everyone within 3km that ${dogName} is missing.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send SOS', style: 'destructive', onPress: async () => {
        const { coords } = await Location.getCurrentPositionAsync({});
        const r = await api<{ notified: number }>('/sos/broadcast', {
          method: 'POST', body: JSON.stringify({ dogId, lat: coords.latitude, lng: coords.longitude }) });
        Alert.alert('Alert sent', `${r.notified} nearby owners notified.`);
      } },
    ]);

  return (
    <ScrollView className="flex-1 bg-slate-50 px-5 pt-14">
      <Text className="text-3xl font-extrabold text-slate-900">Hey, {dogName}'s human 🐾</Text>

      <View className="mt-6 rounded-3xl bg-emerald-500 p-5">
        <Text className="font-semibold text-emerald-50">Today's PawGoals</Text>
        <Text className="mt-1 text-4xl font-black text-white">{pct}%</Text>
        <View className="mt-3 h-3 overflow-hidden rounded-full bg-emerald-700/40">
          <View className="h-3 rounded-full bg-white" style={{ width: `${pct}%` }} />
        </View>
        <Text className="mt-2 text-emerald-50">{done} of {goals.length} done</Text>
      </View>

      <Text className="mb-3 mt-8 text-lg font-bold text-slate-900">Upcoming playdates</Text>
      {playdates.length === 0 && <Text className="text-slate-500">Nothing planned yet. Find a pal!</Text>}
      {playdates.map((p) => (
        <View key={p.id} className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
          <Text className="font-bold text-slate-900">{p.title}</Text>
          <Text className="text-slate-500">📍 {p.locationName} · {new Date(p.scheduledAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      ))}

      <TouchableOpacity onPress={triggerSos} className="mb-12 mt-6 items-center rounded-2xl bg-red-500 py-4 active:bg-red-600">
        <Text className="text-lg font-extrabold text-white">🚨 SOS · Lost dog</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
