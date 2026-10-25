CREATE TABLE public.shared_items (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  kind text not null check (kind in ('file','text')),
  title text,
  text_content text,
  file_name text,
  mime_type text,
  file_size integer,
  storage_path text,
  created_at timestamptz not null default now()
);

CREATE TABLE public.item_views (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.shared_items(id) on delete cascade not null,
  ip_address text,
  city text,
  region text,
  country text,
  timezone text,
  user_agent text,
  opened_at timestamptz not null default now()
);

GRANT ALL ON public.shared_items TO service_role;
GRANT ALL ON public.item_views TO service_role;
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_views ENABLE ROW LEVEL SECURITY;