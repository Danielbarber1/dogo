import React, { useState } from 'react';
import { Alert, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../lib/api';

const CATS = ['FOOD', 'TREATS', 'VET', 'TOYS', 'GROOMING', 'TRAINING'] as const;
const EMOJI: Record<string, string> = { FOOD: '🍖', TREATS: '🦴', VET: '💉', TOYS: '🎾', GROOMING: '🛁', TRAINING: '🎓' };
type Summary = { monthlyTotal: number; byCategory: { category: string; total: number }[]; budget: number | null; usage: number | null; warning: 'NEAR' | 'OVER' | null };

export default function BudgetTrackerScreen({ dogId }: { dogId: string }) {
  const [s, setS] = useState<Summary>({ monthlyTotal: 0, byCategory: [], budget: null, usage: null, warning: null });
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<(typeof CATS)[number]>('FOOD');
  const [notes, setNotes] = useState('');

  const save = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) return Alert.alert('Enter a valid amount');
    try {
      const r = await api<Summary>('/expenses', { method: 'POST', body: JSON.stringify({ dogId, amount: value, category, notes: notes || undefined }) });
      setS(r); setOpen(false); setAmount(''); setNotes('');
    } catch (e: any) { Alert.alert('Could not save', e.message); }
  };

  const bar = s.warning === 'OVER' ? 'bg-red-500' : s.warning === 'NEAR' ? 'bg-amber-400' : 'bg-emerald-500';
  const max = Math.max(1, ...s.byCategory.map((c) => c.total));

  return (
    <View className="flex-1 bg-slate-50 px-5 pt-14">
      <Text className="text-3xl font-extrabold text-slate-900">DoggyBudget 💸</Text>
      <View className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <Text className="text-slate-500">This month</Text>
        <Text className="text-4xl font-black text-slate-900">₪{s.monthlyTotal.toFixed(0)}{s.budget ? <Text className="text-lg text-slate-400"> / ₪{s.budget}</Text> : null}</Text>
        {s.usage !== null && (
          <View className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <View className={`h-3 rounded-full ${bar}`} style={{ width: `${Math.min(100, s.usage * 100)}%` }} />
          </View>
        )}
        {s.warning && <Text className={`mt-2 font-semibold ${s.warning === 'OVER' ? 'text-red-600' : 'text-amber-600'}`}>
          {s.warning === 'OVER' ? 'Over budget this month!' : 'Heads up: 80% of budget used'}</Text>}
      </View>

      <View className="mt-6">
        {CATS.map((c) => {
          const t = s.byCategory.find((x) => x.category === c)?.total ?? 0;
          return (
            <View key={c} className="mb-3">
              <View className="flex-row justify-between"><Text className="text-slate-700">{EMOJI[c]} {c[0] + c.slice(1).toLowerCase()}</Text><Text className="font-semibold text-slate-900">₪{t.toFixed(0)}</Text></View>
              <View className="mt-1 h-2 rounded-full bg-slate-100"><View className="h-2 rounded-full bg-indigo-500" style={{ width: `${(t / max) * 100}%` }} /></View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity onPress={() => setOpen(true)} className="absolute bottom-10 right-5 h-16 w-16 items-center justify-center rounded-full bg-indigo-600 shadow-lg">
        <Text className="text-3xl text-white">+</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-white p-6 pb-10">
            <Text className="text-xl font-bold text-slate-900">Add expense</Text>
            <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount" className="mt-4 rounded-xl bg-slate-100 p-4 text-lg" />
            <View className="mt-4 flex-row flex-wrap">
              {CATS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setCategory(c)} className={`mb-2 mr-2 rounded-full px-4 py-2 ${category === c ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                  <Text className={category === c ? 'text-white' : 'text-slate-700'}>{EMOJI[c]} {c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" className="mt-2 rounded-xl bg-slate-100 p-4" />
            <TouchableOpacity onPress={save} className="mt-5 items-center rounded-2xl bg-indigo-600 py-4"><Text className="font-bold text-white">Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setOpen(false)} className="mt-2 items-center py-2"><Text className="text-slate-500">Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
