import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../lib/api';

type Dog = { id: string; name: string; breed: string; age: number; size: string; energyLevel: number; tags: string[]; avatarUrl?: string; distanceKm: number };
const BREEDS = ['Any', 'Golden Retriever', 'Labrador', 'Husky', 'Border Collie'];
const RADII = [1, 3, 5, 10];

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} className={`mr-2 rounded-full px-4 py-2 ${active ? 'bg-indigo-600' : 'bg-white'}`}>
    <Text className={active ? 'font-semibold text-white' : 'text-slate-700'}>{label}</Text>
  </TouchableOpacity>
);

export default function DogMatchScreen() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [breed, setBreed] = useState('Any');
  const [radiusKm, setRadius] = useState(5);
  const [minEnergy, setMinEnergy] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { coords } = await Location.getCurrentPositionAsync({});
      const params: Record<string, string> = { lat: String(coords.latitude), lng: String(coords.longitude), radiusKm: String(radiusKm), minEnergy: String(minEnergy) };
      if (breed !== 'Any') params.breed = breed;
      setDogs(await api<Dog[]>(`/dogs/match?${new URLSearchParams(params)}`));
    } catch (e: any) { Alert.alert('Oops', e.message); } finally { setLoading(false); }
  }, [breed, radiusKm, minEnergy]);

  useEffect(() => { load(); }, [load]);

  const invite = (d: Dog) => Alert.alert(`Playdate with ${d.name}?`, 'Opens the playdate creator.', [{ text: 'Not now' }, { text: 'Plan it', onPress: () => {/* navigation.navigate('CreatePlaydate', { dog: d }) */} }]);

  return (
    <View className="flex-1 bg-slate-50 pt-14">
      <Text className="px-5 text-3xl font-extrabold text-slate-900">Find a pal 🐕</Text>
      <FlatList horizontal showsHorizontalScrollIndicator={false} className="mt-4 max-h-12 px-5" data={BREEDS} keyExtractor={(b) => b}
        renderItem={({ item }) => <Chip label={item} active={breed === item} onPress={() => setBreed(item)} />} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} className="mt-2 max-h-12 px-5" data={RADII} keyExtractor={(r) => String(r)}
        renderItem={({ item }) => <Chip label={`${item} km`} active={radiusKm === item} onPress={() => setRadius(item)} />} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} className="mt-2 max-h-12 px-5" data={[1, 2, 3, 4, 5]} keyExtractor={(n) => String(n)}
        renderItem={({ item }) => <Chip label={`⚡${item}+`} active={minEnergy === item} onPress={() => setMinEnergy(item)} />} />

      {loading ? <ActivityIndicator className="mt-16" /> : (
        <FlatList numColumns={2} data={dogs} keyExtractor={(d) => d.id} contentContainerClassName="p-3"
          ListEmptyComponent={<Text className="mt-16 text-center text-slate-500">No pals nearby. Try a wider radius.</Text>}
          renderItem={({ item }) => (
            <View className="m-2 flex-1 overflow-hidden rounded-3xl bg-white shadow-sm">
              <Image source={{ uri: item.avatarUrl ?? 'https://placedog.net/300/300' }} className="h-36 w-full" />
              <View className="p-3">
                <Text className="text-lg font-bold text-slate-900">{item.name}</Text>
                <Text className="text-slate-500">{item.breed} · {item.age}y</Text>
                <Text className="mt-1 text-xs text-indigo-600">⚡{item.energyLevel}/5 · {item.distanceKm.toFixed(1)} km</Text>
                <View className="mt-2 flex-row flex-wrap">
                  {item.tags.slice(0, 2).map((t) => <Text key={t} className="mb-1 mr-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{t}</Text>)}
                </View>
                <TouchableOpacity onPress={() => invite(item)} className="mt-2 items-center rounded-xl bg-indigo-600 py-2">
                  <Text className="font-semibold text-white">Plan playdate</Text>
                </TouchableOpacity>
              </View>
            </View>
          )} />
      )}
    </View>
  );
}
