-- lib/supabase/supabase_sample_data.sql

-- Helper function to insert users into auth.users and return their UUID
CREATE OR REPLACE FUNCTION insert_user_to_auth(
    email text,
    password text
) RETURNS UUID AS $$
DECLARE
  user_id uuid;
  encrypted_pw text;
BEGIN
  user_id := gen_random_uuid();
  encrypted_pw := crypt(password, gen_salt('bf'));
  
  INSERT INTO auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  VALUES
    (gen_random_uuid(), user_id, 'authenticated', 'authenticated', email, encrypted_pw, '2023-05-03 19:41:43.585805+00', '2023-04-22 13:10:03.275387+00', '2023-04-22 13:10:31.458239+00', '{"provider":"email","providers":["email"]}', '{}', '2023-05-03 19:41:43.580424+00', '2023-05-03 19:41:43.585948+00', '', '', '', '');
  
  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), user_id, format('{"sub":"%s","email":"%s"}', user_id::text, email)::jsonb, 'email', '2023-05-03 19:41:43.582456+00', '2023-05-03 19:41:43.582497+00', '2023-05-03 19:41:43.582497+00');
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data into handlers
INSERT INTO handlers (id, name, category, description, personality_style, avatar, greeting_message) VALUES
(gen_random_uuid(), 'Zen Master Zola', 'Mindfulness', 'A calm and wise guide for inner peace and focus.', 'Calm, Wise, Encouraging', 'https://example.com/zola_avatar.png', 'Welcome, seeker. Let us find your inner calm.'),
(gen_random_uuid(), 'Task Titan Rex', 'Productivity', 'An energetic and results-driven coach to conquer your to-do list.', 'Energetic, Direct, Motivational', 'https://example.com/rex_avatar.png', 'Ready to crush some tasks? Let''s go!'),
(gen_random_uuid(), 'Creative Catalyst Clio', 'Creativity', 'An imaginative muse to spark new ideas and overcome creative blocks.', 'Playful, Inspiring, Abstract', 'https://example.com/clio_avatar.png', 'What masterpiece shall we create today?'),
(gen_random_uuid(), 'Data Dynamo Dave', 'Analytics', 'A logical and data-focused assistant to help you track progress and optimize.', 'Analytical, Precise, Objective', 'https://example.com/dave_avatar.png', 'Let''s analyze your progress and find the optimal path.'),
(gen_random_uuid(), 'Wellness Whisperer Willow', 'Health & Wellness', 'A gentle guide for holistic well-being, healthy habits, and self-care.', 'Empathetic, Nurturing, Gentle', 'https://example.com/willow_avatar.png', 'How can I support your journey to a healthier you?');

-- Insert sample data into users (dependent on auth.users and handlers)
INSERT INTO users (id, codename, email, avatar_url, selected_handler_id, life_goals, total_stars, level, current_streak, longest_streak)
SELECT
    insert_user_to_auth('alice@example.com', 'password123'),
    'ShadowStriker',
    'alice@example.com',
    'https://example.com/avatar_alice.png',
    (SELECT id FROM handlers WHERE name = 'Task Titan Rex'),
    'Become a master of time management; Learn to code in Python; Run a marathon',
    150, 5, 10, 25
UNION ALL
SELECT
    insert_user_to_auth('bob@example.com', 'password123'),
    'CodeNinja',
    'bob@example.com',
    'https://example.com/avatar_bob.png',
    (SELECT id FROM handlers WHERE name = 'Creative Catalyst Clio'),
    'Write a novel; Start a successful side project; Travel the world',
    300, 8, 15, 30
UNION ALL
SELECT
    insert_user_to_auth('charlie@example.com', 'password123'),
    'ZenSeeker',
    'charlie@example.com',
    'https://example.com/avatar_charlie.png',
    (SELECT id FROM handlers WHERE name = 'Zen Master Zola'),
    'Meditate daily for a year; Achieve inner peace; Learn a new language',
    80, 3, 5, 12
UNION ALL
SELECT
    insert_user_to_auth('diana@example.com', 'password123'),
    'DataSorceress',
    'diana@example.com',
    'https://example.com/avatar_diana.png',
    (SELECT id FROM handlers WHERE name = 'Data Dynamo Dave'),
    'Master data science; Publish a research paper; Build a smart home system',
    220, 7, 8, 18
UNION ALL
SELECT
    insert_user_to_auth('eve@example.com', 'password123'),
    'WellnessWarrior',
    'eve@example.com',
    'https://example.com/avatar_eve.png',
    (SELECT id FROM handlers WHERE name = 'Wellness Whisperer Willow'),
    'Complete a yoga teacher training; Eat plant-based for a year; Hike a national park',
    180, 6, 12, 20;

-- Insert sample data into missions (dependent on users)
INSERT INTO missions (id, user_id, title, description, completed_state, type, status, deadline, stars_earned, assigned_by_user_id, assigned_to_user_id, completed_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'Finish Project Alpha Report',
    'Complete the final report for Project Alpha, including all data analysis and conclusions.',
    'Report submitted and approved.',
    'selfAssigned',
    'completed',
    '2023-11-15 17:00:00+00',
    50,
    NULL,
    NULL,
    '2023-11-14 16:30:00+00'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    'Brainstorm Novel Ideas',
    'Generate at least 10 unique plot ideas for the fantasy novel.',
    '10 plot ideas documented.',
    'aiSuggested',
    'inProgress',
    '2023-12-01 23:59:59+00',
    0,
    NULL,
    NULL,
    NULL
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'charlie@example.com'),
    'Daily 15-min Meditation',
    'Complete a 15-minute guided meditation session every day this week.',
    '7 meditation sessions completed.',
    'recurring',
    'pending',
    '2023-11-20 09:00:00+00',
    0,
    NULL,
    NULL,
    NULL
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'Help Bob with SQL Query',
    'Assist Bob in debugging his complex SQL query for the database migration.',
    'SQL query successfully debugged.',
    'friendAssigned',
    'verified',
    '2023-11-10 12:00:00+00',
    20,
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    '2023-11-09 11:00:00+00'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'diana@example.com'),
    'Analyze Q3 Sales Data',
    'Perform a comprehensive analysis of Q3 sales data and identify key trends.',
    'Analysis report submitted.',
    'selfAssigned',
    'completed',
    '2023-11-22 18:00:00+00',
    40,
    NULL,
    NULL,
    '2023-11-21 17:00:00+00'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'eve@example.com'),
    'Morning Yoga Routine',
    'Complete a 30-minute morning yoga routine.',
    '30-minute yoga routine completed.',
    'recurring',
    'completed',
    '2023-11-16 08:00:00+00',
    10,
    NULL,
    NULL,
    '2023-11-16 07:45:00+00'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'Learn new recipe',
    'Cook a new recipe from the "Healthy Meals" cookbook.',
    'New recipe successfully cooked and enjoyed.',
    'selfAssigned',
    'pending',
    '2023-11-25 19:00:00+00',
    0,
    NULL,
    NULL,
    NULL;

-- Insert sample data into achievements
INSERT INTO achievements (id, name, description, icon, criteria, stars_required, category) VALUES
(gen_random_uuid(), 'First Step', 'Complete your very first mission.', '⭐', 'Complete 1 mission', 0, 'Beginner'),
(gen_random_uuid(), 'Streak Starter', 'Achieve a 3-day mission streak.', '🔥', 'Maintain a 3-day mission streak', 50, 'Consistency'),
(gen_random_uuid(), 'Mission Master', 'Complete 10 missions.', '🏆', 'Complete 10 missions', 100, 'Completion'),
(gen_random_uuid(), 'Social Butterfly', 'Add 3 friends.', '🦋', 'Have 3 accepted friends', 30, 'Social'),
(gen_random_uuid(), 'Star Collector I', 'Earn 100 stars.', '🌟', 'Accumulate 100 total stars', 100, 'Progression'),
(gen_random_uuid(), 'Zen Achiever', 'Complete 5 mindfulness-related missions.', '🧘', 'Complete 5 missions with "mindfulness" in title/description', 75, 'Mindfulness');

-- Insert sample data into user_achievements (dependent on users and achievements)
INSERT INTO user_achievements (id, user_id, achievement_id)
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    (SELECT id FROM achievements WHERE name = 'First Step')
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    (SELECT id FROM achievements WHERE name = 'Mission Master')
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    (SELECT id FROM achievements WHERE name = 'First Step')
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'charlie@example.com'),
    (SELECT id FROM achievements WHERE name = 'First Step')
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'charlie@example.com'),
    (SELECT id FROM achievements WHERE name = 'Zen Achiever')
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'diana@example.com'),
    (SELECT id FROM achievements WHERE name = 'Star Collector I');

-- Insert sample data into friends (dependent on users)
INSERT INTO friends (id, user_id, friend_user_id, status)
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    'accepted'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'accepted'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    (SELECT id FROM users WHERE email = 'charlie@example.com'),
    'pending'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'diana@example.com'),
    (SELECT id FROM users WHERE email = 'eve@example.com'),
    'accepted'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'eve@example.com'),
    (SELECT id FROM users WHERE email = 'diana@example.com'),
    'accepted';

-- Insert sample data into messages (dependent on users)
INSERT INTO messages (id, sender_id, receiver_id, content, is_read)
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    'Hey Bob, how''s that SQL query coming along?',
    TRUE
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'Almost there! Thanks for your help yesterday.',
    TRUE
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'charlie@example.com'),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'I sent you a friend request!',
    FALSE
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'diana@example.com'),
    (SELECT id FROM users WHERE email = 'eve@example.com'),
    'Did you see the new wellness challenge?',
    TRUE;

-- Insert sample data into chat_messages (dependent on users)
INSERT INTO chat_messages (id, user_id, role, content)
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'user',
    'I need help organizing my tasks for the week.'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'alice@example.com'),
    'handler',
    'Of course, ShadowStriker! Let''s break down your week into manageable missions. What are your top priorities?'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    'user',
    'I''m stuck on a creative block for my novel. Any ideas?'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'bob@example.com'),
    'handler',
    'Ah, a classic challenge for a CodeNinja! Let''s try some free association. What''s the most unexpected thing that could happen to your main character?'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'charlie@example.com'),
    'user',
    'How can I improve my meditation practice?'
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM users WHERE email = 'charlie@example.com'),
    'handler',
    'ZenSeeker, consistency is key. Try setting a specific time each day and finding a quiet space. We can explore different techniques if you like.'
UNION ALL
SELECT
    gen_random_uuid(),