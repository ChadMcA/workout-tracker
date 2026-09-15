# Workout Tracker

A personal workout tracker: log workouts, track strength volume by muscle group,
cardio time and Stairmaster progress, bodyweight reps (core / pushups / pull-ups),
and a calendar heatmap of your training history. Built to be installed on your
phone's home screen like a native app.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Postgres (via `pg`,
no ORM) + Recharts. No Prisma — this avoids a binary-download step that some
sandboxed/CI environments block, and keeps the whole data layer to plain SQL you
can read end-to-end in `db/schema.sql` and `src/lib/db.ts`.

---

## 1. Local setup

```bash
npm install
cp .env.example .env.local   # then edit DATABASE_URL inside it
```

You need a Postgres database. Options, easiest first:

- **Local Postgres** — if you have Postgres installed, `createdb workout_dev` and
  point `DATABASE_URL` at `postgresql://postgres:yourpassword@localhost:5432/workout_dev`.
- **Neon** (what Vercel Postgres runs on) — free tier, works great, see step 3.
- **Supabase** — also fine, same idea.

Once `DATABASE_URL` is set:

```bash
npm run db:migrate   # creates tables
npm run db:seed      # loads your historical data + starter templates
npm run dev          # http://localhost:3000
```

The seed script reads `data/parsed_entries.json` and `data/day_notes.json` — your
actual historical workout data, already cleaned up (bodyweight exercises fixed,
duplicate exercise names merged, etc.) — and loads it in along with three
starter templates (Chest & Back, Bi's & Tri's, Back & Legs) detected from your
real training patterns.

**Re-seeding:** the seed script always inserts fresh rows and does not clear
existing data first. If you need to start over, drop and recreate the database
(or `TRUNCATE workout_days, sets, exercises, templates, template_exercises
RESTART IDENTITY CASCADE;`) before re-running `npm run db:seed`.

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create workout-tracker --private --source=. --push
# or manually: create a repo on github.com, then
#   git remote add origin <your-repo-url>
#   git push -u origin main
```

---

## 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo.
2. **Add a Postgres database:** in the Vercel dashboard, go to your project →
   Storage → Create Database → Postgres (this provisions a Neon database and
   wires `DATABASE_URL` into your project's environment variables
   automatically — you don't need to copy/paste anything).
   - If you'd rather use your own Neon/Supabase project, just add `DATABASE_URL`
     manually under Project Settings → Environment Variables.
3. Deploy. Vercel will run `npm run build` automatically.
4. **Run the migration + seed once**, against the production database:
   - Easiest: pull the production env var locally and run the scripts from your
     machine:
     ```bash
     vercel env pull .env.production.local
     DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d '=' -f2- | tr -d '"') npm run db:migrate
     DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d '=' -f2- | tr -d '"') npm run db:seed
     ```
   - Or connect directly with `psql` / a GUI client (TablePlus, Postico, etc.)
     using the connection string from Vercel's Storage tab, and run
     `db/schema.sql` by hand, then run `npm run db:seed` locally pointed at
     that same `DATABASE_URL`.
5. Open the deployed URL on your phone, tap the browser's Share button, and
   choose **"Add to Home Screen."** It'll launch full-screen with no browser
   chrome, using the dark app icon already set up in `public/`.

---

## 4. Project structure

```
db/schema.sql                  All tables (exercises, workout_days, sets, templates)
scripts/migrate.ts              Applies schema.sql
scripts/seed.ts                 Loads historical data + starter templates
data/parsed_entries.json        Your cleaned historical workout data
data/day_notes.json             Freeform day notes (home workouts, outdoor runs)

src/lib/db.ts                   Postgres connection pool + query helpers
src/lib/muscleGroups.ts         Exercise -> muscle group mapping, bench math, bodyweight rules
src/lib/dateUtils.ts            Week/month bucketing for charts
src/lib/colors.ts               Shared color palette
src/lib/types.ts                Shared TypeScript types

src/app/page.tsx                Log tab (templates, exercise search, save)
src/app/strength/page.tsx       Strength tab (toggleable muscle-group chart)
src/app/cardio/page.tsx         Cardio tab (time stacked bar + Stairmaster line)
src/app/bodyweight/page.tsx     Bodyweight tab (core/pushups/pull-ups)
src/app/calendar/page.tsx       Calendar tab (month heatmap, home override)

src/app/api/*                   All backend routes (exercises, entries, templates, stats)
src/components/                 TabBar + shared UI primitives
```

---

## 5. Design notes / decisions baked in

- **Bench math:** Bench, Bench incline, and Incline bench are always treated as
  per-side weight: total load = `(weight x 2) + 20lb bar`, regardless of
  whether "each" was marked -- this matches how you actually logged them.
- **Bodyweight exercises** (Leg raises, Body weight squats, Pushups, Pull-ups)
  have no weight; their two numbers are reps and sets, not weight and reps.
- **Home-workout override:** on the Calendar tab, if a workout day is tagged
  "Home," it always shows as a Home day regardless of which muscle groups were
  trained -- a bodyweight home session doesn't get miscategorized as "legs
  only" just because it lacks barbell exercises.
- **Muscle group volume:** "Legs" dominates total volume by a wide margin
  (heavy calf-extension / leg-press loads). The Strength tab's toggle chips
  exist specifically so you can deselect Legs and see the other muscle groups
  at a readable scale.
- Charts anchor "last N weeks" / "last N months" to the most recent logged
  workout in the database, not the real calendar date -- so the charts are
  never empty just because you haven't opened the app today.

---

## 6. Adding new exercises

New exercises typed into the Log tab's search box that don't exist yet aren't
auto-created in this version -- you'd add a row to the `exercises` table (or we
can add a "create new exercise" flow to the Log tab as a follow-up). If you
add a new strength exercise, also add it to `EXERCISE_MUSCLE_MAP` in
`src/lib/muscleGroups.ts` so it shows up correctly in the Strength tab.

---

## 7. A note on dependency versions

Prisma was intentionally avoided (not because it's bad -- it's excellent -- but
its CLI downloads native query-engine binaries from Prisma's own CDN, which
some sandboxed build environments block outright). `pg` + hand-written SQL has
zero native dependencies and was fully tested end-to-end against a real local
Postgres instance while building this. Prisma versions 7.x and 8.x currently
on npm also carry a few unresolved advisories in their CLI tooling (not
runtime code) -- another reason to skip it here.
