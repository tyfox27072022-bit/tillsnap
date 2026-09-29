alter table sales add column if not exists method text not null default 'cash';
alter table sales add column if not exists voided boolean not null default false;
