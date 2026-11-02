-- ============================================================================
-- JanMitra Database Setup - Step 5: Seed Data (Categories & Badges)
-- ============================================================================
-- Run after 04_storage.sql.
-- This inserts the reference categories and badges used by the mobile app.
-- Safe to re-run (uses ON CONFLICT to skip existing rows).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------------------
insert into public.categories (name, description, icon) values
  ('Damaged Public Infrastructure', 'Damaged public property and infrastructure', 'domain_disabled'),
  ('Garbage / Sanitation',           'Garbage, waste and sanitation issues',      'delete_outline'),
  ('Other',                          'Other civic issues',                         'category'),
  ('Pothole',                        'Potholes on roads and streets',              'report_problem'),
  ('Public Safety',                  'Public safety hazards and concerns',         'security'),
  ('Road Damage',                    'Damaged or broken road surfaces',            'add_road'),
  ('Stray Animals',                  'Stray animal issues in public areas',        'pets'),
  ('Streetlight',                    'Broken or non-functional streetlights',       'lightbulb_outline'),
  ('Unauthorized Construction',      'Illegal or unauthorized construction',       'engineering'),
  ('Water / Drainage',               'Water leakage, drainage and sewage issues',  'water_drop')
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- BADGES
-- ----------------------------------------------------------------------------
insert into public.badges (name, description, icon, criteria) values
  ('First Report',            'Submitted your first civic complaint',          'flag',              'Submit 1 complaint'),
  ('Civic Starter',           'Submitted 5 civic complaints',                   'rocket_launch',      'Submit 5 complaints'),
  ('Neighborhood Helper',     'Submitted 10 complaints in your area',           'home',              'Submit 10 complaints'),
  ('Clean Streets Champion',  'Reported 5 garbage/sanitation issues',          'cleaning_services', 'Report 5 sanitation issues'),
  ('Consistent Citizen',       'Submitted complaints across 3 categories',      'star',              'Report in 3 different categories'),
  ('Community Watcher',        'Active for 30 days',                            'visibility',        'Be active for 30 days'),
  ('Verified Contributor',     'Had a complaint verified as resolved',         'verified',          'Get 1 complaint verified')
on conflict (name) do nothing;
