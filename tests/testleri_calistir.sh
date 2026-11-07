#!/usr/bin/env bash
# Yerel Postgres'te veritabanını sıfırdan kurar ve senaryo testlerini çalıştırır.
# Kullanım: PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./tests/testleri_calistir.sh
# Bir test başarısız olursa betik hata koduyla biter (CI bunu kırmızı gösterir).
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -q"

# Yalnız gerçek Supabase'de çalışan dosyalar (pg_cron / pg_net eklentileri yerelde yok)
ATLA="0004_zamanlayici.sql 0011_sunucu_zamanlamalari.sql"

$P -c "drop database if exists okindo_test" >/dev/null
$P -c "create database okindo_test" >/dev/null
$P -d okindo_test -f tests/yerel_supabase_taklidi.sql >/dev/null
for f in supabase/migrations/*.sql; do
  case " $ATLA " in *" $(basename "$f") "*) continue ;; esac
  $P -d okindo_test -f "$f" >/dev/null
done

cikti=$(psql -v ON_ERROR_STOP=1 -q -t -A -d okindo_test -f tests/senaryo_testleri.sql 2>&1) || {
  printf '%s\n' "$cikti" | grep -E "^(TAMAM|---|TÜM)|ERROR|BAŞARISIZ" || printf '%s\n' "$cikti" | tail -20
  echo "TESTLER BAŞARISIZ" >&2
  exit 1
}
printf '%s\n' "$cikti" | grep -E "^(TAMAM|---|TÜM|BAŞARISIZ)|ERROR"
printf '%s\n' "$cikti" | grep -q "TÜM TESTLER BAŞARILI"
