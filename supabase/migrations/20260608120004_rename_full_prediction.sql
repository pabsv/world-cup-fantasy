-- Rename the up-front "OG Full Run" competition to user-facing "Full World Cup Prediction".
-- Surfaces on the leaderboard tab; the predict UI hardcodes the label.
update public.competitions
set title = 'Full World Cup Prediction',
    subtitle = 'Predict the entire tournament before kickoff'
where type = 'og_full';
