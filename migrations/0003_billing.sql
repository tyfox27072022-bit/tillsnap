alter table shops add column if not exists stripe_customer_id text;
alter table shops add column if not exists stripe_subscription_id text;
alter table shops add column if not exists billing_status text not null default 'unpaid';
alter table shops add column if not exists payment_due_at timestamptz;
update shops set payment_due_at = created_at where payment_due_at is null;
