// Simge (Ionicons)
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps } from 'react';
import { renk } from './tema';

export type SimgeAdi = ComponentProps<typeof Ionicons>['name'];

export function Simge({ ad, boyut: b = 20, renkli = renk.metin }: { ad: SimgeAdi; boyut?: number; renkli?: string }) {
  return <Ionicons name={ad} size={b} color={renkli} />;
}
