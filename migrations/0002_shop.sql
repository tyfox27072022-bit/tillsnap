create table if not exists shops (
  id text primary key,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  user_id text not null,
  shop_id text not null references shops(id),
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create index if not exists memberships_user_idx on memberships (user_id);

create table if not exists products (
  id serial primary key,
  shop_id text not null references shops(id),
  barcode text not null,
  name text not null,
  price_pence integer not null,
  stock integer not null default 0,
  low_stock_at integer not null default 3,
  category text not null default 'Grocery',
  updated_at timestamptz not null default now(),
  unique (shop_id, barcode)
);

create index if not exists products_shop_idx on products (shop_id);

create table if not exists alerts (
  id serial primary key,
  shop_id text not null references shops(id),
  barcode text not null,
  name text not null,
  created_at timestamptz not null default now(),
  dismissed boolean not null default false
);

create table if not exists sales (
  id serial primary key,
  shop_id text not null references shops(id),
  user_id text not null,
  total_pence integer not null,
  items text not null,
  created_at timestamptz not null default now()
);
