-- Seed: global league, the two MVP competitions, 12 groups, 48 teams.
-- Draw verified against Wikipedia 2026 final draw + the project Excel (agree exactly).

insert into public.leagues (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'World Cup 2026')
on conflict (id) do nothing;

-- locks_at = opening match kickoff (Mexico, Estadio Azteca), 2026-06-11 19:00 Mexico City time.
insert into public.competitions (league_id, type, title, subtitle, locks_at, status, scoring_config, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'group_standings', 'Group Stage',
   'Rank all 4 teams in every group', '2026-06-11T19:00:00-06:00', 'open',
   '{"group":{"positions":{"1":5,"2":3,"3":2,"4":1},"perfect_bonus":5}}'::jsonb, 1),
  ('11111111-1111-1111-1111-111111111111', 'og_full', 'Full World Cup Prediction',
   'Predict the entire tournament before kickoff', '2026-06-11T19:00:00-06:00', 'open',
   '{"group":{"positions":{"1":5,"2":3,"3":2,"4":1},"perfect_bonus":5},"knockout":{"R32":1,"R16":2,"QF":4,"SF":6,"final":8,"champion":12},"third_place":1}'::jsonb, 2)
on conflict (league_id, type) do nothing;

insert into public.groups (id, name) values
  ('A','Group A'),('B','Group B'),('C','Group C'),('D','Group D'),
  ('E','Group E'),('F','Group F'),('G','Group G'),('H','Group H'),
  ('I','Group I'),('J','Group J'),('K','Group K'),('L','Group L')
on conflict (id) do nothing;

insert into public.teams (group_id, name, flag_code, seed) values
  ('A','Mexico','mx',1),       ('A','South Africa','za',2),  ('A','South Korea','kr',3),  ('A','Czechia','cz',4),
  ('B','Canada','ca',1),       ('B','Bosnia & Herzegovina','ba',2), ('B','Qatar','qa',3), ('B','Switzerland','ch',4),
  ('C','Brazil','br',1),       ('C','Morocco','ma',2),       ('C','Haiti','ht',3),        ('C','Scotland','gb-sct',4),
  ('D','United States','us',1),('D','Paraguay','py',2),      ('D','Australia','au',3),    ('D','Turkey','tr',4),
  ('E','Germany','de',1),      ('E','Curacao','cw',2),       ('E','Ivory Coast','ci',3),  ('E','Ecuador','ec',4),
  ('F','Netherlands','nl',1),  ('F','Japan','jp',2),         ('F','Sweden','se',3),       ('F','Tunisia','tn',4),
  ('G','Belgium','be',1),      ('G','Egypt','eg',2),         ('G','Iran','ir',3),         ('G','New Zealand','nz',4),
  ('H','Spain','es',1),        ('H','Cape Verde','cv',2),    ('H','Saudi Arabia','sa',3), ('H','Uruguay','uy',4),
  ('I','France','fr',1),       ('I','Senegal','sn',2),       ('I','Iraq','iq',3),         ('I','Norway','no',4),
  ('J','Argentina','ar',1),    ('J','Algeria','dz',2),       ('J','Austria','at',3),      ('J','Jordan','jo',4),
  ('K','Portugal','pt',1),     ('K','DR Congo','cd',2),      ('K','Uzbekistan','uz',3),   ('K','Colombia','co',4),
  ('L','England','gb-eng',1),  ('L','Croatia','hr',2),       ('L','Ghana','gh',3),        ('L','Panama','pa',4)
on conflict (name) do nothing;
