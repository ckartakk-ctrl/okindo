import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Profil } from './tipler';

export type Mod = 'musteri' | 'hv';

type OturumDegeri = {
  hazir: boolean;
  oturum: Session | null;
  profil: Profil | null;
  mod: Mod;
  modDegistir: (m: Mod) => void;
  profilYenile: () => Promise<void>;
  cikis: () => Promise<void>;
};

const OturumBaglami = createContext<OturumDegeri | null>(null);

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [hazir, setHazir] = useState(false);
  const [oturum, setOturum] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [mod, setMod] = useState<Mod>('musteri');

  const profilYukle = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const { data } = await supabase.from('profiller').select('*').eq('id', s.user.id).maybeSingle();
    setProfil((data as Profil) ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const kayitli = await AsyncStorage.getItem('okindo-mod');
        if (kayitli === 'hv' || kayitli === 'musteri') setMod(kayitli);
      } catch {
        // tarayıcı deposu kullanılamıyorsa varsayılan mod kalır
      }
      try {
        const { data } = await supabase.auth.getSession();
        setOturum(data.session);
        await profilYukle(data.session);
      } catch {
        setOturum(null);
      } finally {
        setHazir(true);
      }
    })();
    const { data: dinleyici } = supabase.auth.onAuthStateChange((_olay, s) => {
      setOturum(s);
      profilYukle(s);
    });
    return () => dinleyici.subscription.unsubscribe();
  }, [profilYukle]);

  const modDegistir = useCallback((m: Mod) => {
    setMod(m);
    AsyncStorage.setItem('okindo-mod', m).catch(() => undefined);
  }, []);

  const deger: OturumDegeri = {
    hazir,
    oturum,
    profil,
    mod: profil && profil.hv_durum !== 'yok' ? mod : 'musteri',
    modDegistir,
    profilYenile: () => profilYukle(oturum),
    cikis: async () => {
      await supabase.auth.signOut();
    },
  };

  return <OturumBaglami.Provider value={deger}>{children}</OturumBaglami.Provider>;
}

export function useOturum(): OturumDegeri {
  const d = useContext(OturumBaglami);
  if (!d) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı');
  return d;
}
