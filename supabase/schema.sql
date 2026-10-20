create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null default '',
    phone text not null default '',
    role text not null default 'buyer' check (role in ('buyer', 'artisan')),
    artisan_city text,
    artisan_craft text,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
    on public.profiles for select
    to authenticated
    using ((select auth.uid()) = id);

grant select on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        id,
        full_name,
        phone,
        role,
        artisan_city,
        artisan_craft
    ) values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', ''),
        coalesce(new.raw_user_meta_data ->> 'phone', ''),
        case
            when new.raw_user_meta_data ->> 'role' = 'artisan' then 'artisan'
            else 'buyer'
        end,
        new.raw_user_meta_data ->> 'artisan_city',
        new.raw_user_meta_data ->> 'artisan_craft'
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    slug text not null unique,
    name text not null,
    description text not null default '',
    price numeric(10, 2) not null check (price > 0),
    stock integer not null default 0 check (stock >= 0),
    length_cm numeric(8, 2) not null check (length_cm > 0),
    width_cm numeric(8, 2) not null check (width_cm > 0),
    weight_g integer not null check (weight_g > 0),
    status text not null default 'published' check (status in ('draft', 'published')),
    created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Published products are public" on public.products;
create policy "Published products are public"
    on public.products for select
    to anon, authenticated
    using (status = 'published');

drop policy if exists "Artisans manage their products" on public.products;
create policy "Artisans manage their products"
    on public.products for all
    to authenticated
    using (
        owner_id = (select auth.uid())
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid()) and profiles.role = 'artisan'
        )
    )
    with check (
        owner_id = (select auth.uid())
        and exists (
            select 1 from public.profiles
            where profiles.id = (select auth.uid()) and profiles.role = 'artisan'
        )
    );

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

create table if not exists public.product_reviews (
    id uuid primary key default gen_random_uuid(),
    product_slug text not null,
    author_id uuid not null references auth.users (id) on delete cascade,
    author_name text not null,
    rating smallint not null check (rating between 1 and 5),
    comment text not null check (length(trim(comment)) between 1 and 1000),
    verified_purchase boolean not null default false,
    created_at timestamptz not null default now(),
    unique (product_slug, author_id)
);

alter table public.product_reviews enable row level security;

drop policy if exists "Product reviews are public" on public.product_reviews;
create policy "Product reviews are public"
    on public.product_reviews for select
    to anon, authenticated
    using (true);

drop policy if exists "Authenticated buyers can review" on public.product_reviews;
create policy "Authenticated buyers can review"
    on public.product_reviews for insert
    to authenticated
    with check (author_id = (select auth.uid()));

grant select on public.product_reviews to anon, authenticated;
grant insert (product_slug, author_id, author_name, rating, comment) on public.product_reviews to authenticated;