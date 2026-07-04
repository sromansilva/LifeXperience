import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-a3ae946d/health", (c) => {
  return c.json({ status: "ok" });
});

// ─── Bootstrap: create profiles table if not exists ───────────────────────────
// Run once via: GET /make-server-a3ae946d/setup
app.get("/make-server-a3ae946d/setup", async (c) => {
  const sql = `
    create table if not exists public.profiles (
      id          uuid primary key references auth.users(id) on delete cascade,
      email       text not null,
      role        text not null default 'student' check (role in ('student','teacher')),
      name        text not null default '',
      last        text not null default '',
      grade       text not null default '',
      hair_color  text not null default '#2C1810',
      hair_style  text not null default 'A',
      skin_tone   text not null default '#FDBCB4',
      shirt_color text not null default '#6D28D9',
      pet         text not null default '🐶',
      level       integer not null default 1,
      xp          integer not null default 0,
      coins       integer not null default 50,
      streak      integer not null default 0,
      subject     text,
      group_name  text,
      created_at  timestamptz default now()
    );

    -- Enable Row Level Security
    alter table public.profiles enable row level security;

    -- Each user can read/write only their own profile
    create policy if not exists "own profile" on public.profiles
      for all using (auth.uid() = id) with check (auth.uid() = id);

    -- Auto-create profile on signup via trigger
    create or replace function public.handle_new_user()
    returns trigger language plpgsql security definer as $$
    begin
      insert into public.profiles (id, email, role)
      values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'student')
      )
      on conflict (id) do nothing;
      return new;
    end;
    $$;

    create or replace trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  `;

  const res = await kv.query(sql).catch((e: Error) => ({ error: e.message }));
  return c.json({ ok: true, result: res });
});

Deno.serve(app.fetch);