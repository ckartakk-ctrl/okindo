// Düğme, girdi, seçenekler, sekmeler
import { Fragment, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Simge, type SimgeAdi } from './Simge';
import { hataGoster } from './durum';
import { bosluk, boyut, renk, stil } from './tema';

/** Detay ekranı sekmeleri: kaydırılabilir satır, etiketler kırılmaz */
export function Sekmeler<T extends string>({
  sekmeler,
  secili,
  sec,
}: {
  sekmeler: { deger: T; ad: string; sayi?: number }[];
  secili: T;
  sec: (d: T) => void;
}) {
  return (
    <View style={stil.sekmeZemin}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: bosluk.s }}>
        {sekmeler.map((s) => {
          const aktif = s.deger === secili;
          return (
            <Pressable
              key={s.deger}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktif }}
              onPress={() => sec(s.deger)}
              style={[stil.sekme, aktif && { borderBottomColor: renk.ana }]}
            >
              <Text numberOfLines={1} style={[stil.metin, { fontWeight: aktif ? '600' : '500', color: aktif ? renk.metin : renk.soluk }]}>
                {s.ad}
              </Text>
              {s.sayi ? (
                <View style={stil.sekmeSayi}>
                  <Text style={{ fontSize: boyut.meta, fontWeight: '600', color: '#FFFFFF' }}>{s.sayi}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ----------------------------- Düğme ------------------------------- */

/**
 * Düğme hiçbir zaman pasif olmaz (forms kuralı). Eksik bir şey varsa `eksik` metni verilir:
 * basınca işlem yapılmaz, sebep düğmenin altında yazılır.
 */
export function Dugme({
  children,
  onPress,
  tur = 'ana',
  eksik,
  simge,
  kucuk,
}: {
  children: string;
  onPress: () => Promise<unknown> | unknown;
  tur?: 'ana' | 'ikincil' | 'tehlike' | 'damga' | 'acik' | 'metin';
  eksik?: string | null;
  simge?: SimgeAdi;
  kucuk?: boolean;
}) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [carkGoster, setCarkGoster] = useState(false);
  const [uyari, setUyari] = useState<string | null>(null);
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!eksik) setUyari(null);
  }, [eksik]);
  useEffect(() => () => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
  }, []);

  const zemin = { ana: renk.ana, tehlike: renk.hata, damga: renk.damga, acik: '#FFFFFF', ikincil: renk.kart, metin: 'transparent' }[tur];
  const yaziRengi = { ana: '#FFFFFF', tehlike: '#FFFFFF', damga: renk.metin, acik: renk.anaKoyu, ikincil: renk.metin, metin: renk.ana }[tur];

  return (
    <View style={{ gap: bosluk.s }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: calisiyor }}
        accessibilityHint={eksik ?? undefined}
        disabled={calisiyor}
        onPress={async () => {
          if (eksik) {
            setUyari(eksik);
            return;
          }
          setUyari(null);
          setCalisiyor(true);
          // 100 ms'den kısa işlerde çark gösterilmez (titreme olmasın)
          zamanlayici.current = setTimeout(() => setCarkGoster(true), 100);
          try {
            await onPress();
          } catch (e) {
            hataGoster(e);
          } finally {
            if (zamanlayici.current) clearTimeout(zamanlayici.current);
            setCalisiyor(false);
            setCarkGoster(false);
          }
        }}
        style={({ pressed }) => [
          stil.dugme,
          kucuk && { minHeight: 44, paddingHorizontal: bosluk.m },
          { backgroundColor: zemin },
          tur === 'ikincil' && { borderWidth: 1, borderColor: renk.cizgi },
          pressed && { opacity: 0.85 },
        ]}
      >
        {carkGoster ? (
          <ActivityIndicator color={yaziRengi} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: bosluk.s }}>
            {simge ? <Simge ad={simge} boyut={20} renkli={yaziRengi} /> : null}
            <Text style={[stil.dugmeYazi, kucuk && { fontSize: boyut.ikincil }, { color: yaziRengi }]}>{children}</Text>
          </View>
        )}
      </Pressable>
      {uyari ? (
        <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: bosluk.s, alignItems: 'flex-start' }}>
          <Simge ad="information-circle" boyut={20} renkli={renk.uyari} />
          <Text style={[stil.ikincil, { color: renk.uyari, flex: 1 }]}>{uyari}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------ Girdi ------------------------------ */

/**
 * Etiket her zaman görünür. Doğrulama ilk ayrılışta (blur) çalışır,
 * kullanıcı alana dönünce ya da yazmaya başlayınca hata hemen kalkar.
 */
export function Girdi({
  etiket,
  ipucu,
  istegeBagli,
  dogrula,
  ...props
}: TextInputProps & {
  etiket: string;
  ipucu?: string;
  istegeBagli?: boolean;
  /** Geçersizse gösterilecek metni döndürür */
  dogrula?: (deger: string) => string | null;
}) {
  const [odak, setOdak] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  return (
    <View style={{ gap: bosluk.s }}>
      <Text style={stil.etiket}>
        {etiket}
        {istegeBagli ? <Text style={{ color: renk.soluk, fontWeight: '400' }}> (isteğe bağlı)</Text> : null}
      </Text>
      <TextInput
        placeholderTextColor={renk.silik}
        accessibilityLabel={etiket}
        {...props}
        onFocus={(e) => {
          setOdak(true);
          setHata(null);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setOdak(false);
          if (dogrula) setHata(dogrula(String(props.value ?? '')));
          props.onBlur?.(e);
        }}
        onChangeText={(t) => {
          if (hata) setHata(null);
          props.onChangeText?.(t);
        }}
        style={[
          stil.girdi,
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
          odak && { borderColor: renk.ana, borderWidth: 2, paddingHorizontal: bosluk.l - 1 },
          hata && { borderColor: renk.hata },
          props.style,
        ]}
      />
      {hata ? (
        <Text accessibilityLiveRegion="polite" style={[stil.ikincil, { color: renk.hata }]}>
          {hata}
        </Text>
      ) : ipucu ? (
        <Text style={[stil.meta, { color: renk.soluk }]}>{ipucu}</Text>
      ) : null}
    </View>
  );
}

/* ---------------------------- Seçenekler --------------------------- */

export function Secenekler<T extends string>({
  secenekler,
  secili,
  sec,
  etiket,
  dikey,
}: {
  secenekler: { deger: T; ad: string; alt?: string }[];
  secili: T | null | undefined;
  sec: (d: T) => void;
  etiket?: string;
  /** Uzun seçenekler alt alta, radyo düğmesi gibi */
  dikey?: boolean;
}) {
  return (
    <View style={{ gap: bosluk.s }}>
      {etiket ? <Text style={stil.etiket}>{etiket}</Text> : null}
      {dikey ? (
        <View style={stil.grup}>
          {secenekler.map((s, i) => {
            const aktif = s.deger === secili;
            return (
              <Fragment key={s.deger}>
                {i > 0 ? <View style={stil.ayirici} /> : null}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: aktif }}
                  onPress={() => sec(s.deger)}
                  style={({ pressed }) => [stil.grupSatiri, pressed && { backgroundColor: '#F2F6F5' }]}
                >
                  <View style={[stil.radyo, aktif && { borderColor: renk.ana }]}>
                    {aktif ? <View style={stil.radyoIc} /> : null}
                  </View>
                  <View style={{ flex: 1, gap: bosluk.xs }}>
                    <Text style={[stil.metin, { fontWeight: aktif ? '600' : '400' }]}>{s.ad}</Text>
                    {s.alt ? <Text style={[stil.ikincil, { color: renk.soluk }]}>{s.alt}</Text> : null}
                  </View>
                </Pressable>
              </Fragment>
            );
          })}
        </View>
      ) : (
        <View style={stil.cipler}>
          {secenekler.map((s) => {
            const aktif = s.deger === secili;
            return (
              <Pressable
                key={s.deger}
                accessibilityRole="radio"
                accessibilityState={{ checked: aktif }}
                onPress={() => sec(s.deger)}
                style={({ pressed }) => [
                  stil.cip,
                  aktif && { backgroundColor: renk.anaKoyu, borderColor: renk.anaKoyu },
                  pressed && !aktif && { backgroundColor: renk.anaAcik },
                ]}
              >
                {aktif ? <Simge ad="checkmark" boyut={16} renkli="#FFFFFF" /> : null}
                <Text style={[stil.cipYazi, aktif && { color: '#FFFFFF' }]}>{s.ad}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ------------------------- Küçük parçalar --------------------------- */
