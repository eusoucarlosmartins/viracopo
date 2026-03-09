-- ============================================================
-- VIRA COPO FC — Migração: Suporte a Temporadas na Agenda
-- Cole este script no SQL Editor do Supabase e clique RUN
-- (Menu esquerdo: SQL Editor → New Query)
-- ============================================================

-- 1. Adiciona coluna 'season' (ano da temporada) e 'game_date' (para ordenação)
alter table schedule
  add column if not exists season    int  default 2026,
  add column if not exists game_date date;

-- 2. Preenche game_date a partir da coluna 'date' (formato DD/MM/YYYY)
update schedule
set game_date = to_date(date, 'DD/MM/YYYY')
where game_date is null and date ~ '^\d{2}/\d{2}/\d{4}$';

-- 3. Preenche season a partir do ano em 'date'
update schedule
set season = extract(year from to_date(date, 'DD/MM/YYYY'))::int
where season = 2026 and date ~ '^\d{2}/\d{2}/\d{4}$';

-- 4. Troca a chave primária de 'idx' (posição no array) para id serial
--    (só necessário se a tabela ainda usa idx como PK)
-- Se der erro "column idx does not exist", ignore este bloco.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name='schedule' and column_name='idx'
  ) then
    alter table schedule drop column if exists idx;
  end if;
end $$;

-- Garante que a tabela tem id serial como PK
alter table schedule
  add column if not exists id bigint generated always as identity;

-- Se id já existe mas não é PK, torna PK:
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    where tc.table_name = 'schedule' and tc.constraint_type = 'PRIMARY KEY'
  ) then
    alter table schedule add primary key (id);
  end if;
end $$;

-- 5. Índice para buscas por temporada
create index if not exists idx_schedule_season on schedule(season);
create index if not exists idx_schedule_game_date on schedule(game_date);

-- 6. Política de acesso (caso ainda não exista para a nova coluna)
-- Nada a fazer — a política "public_all_schedule" já cobre tudo.

-- ============================================================
-- PRONTO! O portal já está preparado para usar este schema.
-- ============================================================
