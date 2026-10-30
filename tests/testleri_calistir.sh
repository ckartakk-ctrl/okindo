#!/usr/bin/env bash
# Yerel Postgres'te veritabanını sıfırdan kurar ve senaryo testlerini çalıştırır.
# Kullanım: PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./tests/testleri_calistir.sh
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists okindo_test" >/dev/null
$P -c "create database okindo_test" >/dev/null
for f in tests/yerel_supabase_taklidi.sql supabase/migrations/0001_sema.sql \
         supabase/migrations/0002_is_kurallari.sql supabase/migrations/0003_ornek_veri.sql supabase/migrations/0006_guvenlik_sikilastirma.sql supabase/migrations/0007_bitis_fotografi_istege_bagli.sql supabase/migrations/0008_hv_profili.sql; do
  $P -d okindo_test -f "$f" >/dev/null
done
psql -v ON_ERROR_STOP=1 -q -t -A -d okindo_test -f tests/senaryo_testleri.sql 2>&1 | grep -E "^(TAMAM|---|TÜM|BAŞARISIZ)|ERROR" || true
