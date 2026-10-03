PRAGMA foreign_keys = ON;
CREATE TABLE users (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
 password_hash TEXT NOT NULL, height REAL CHECK(height BETWEEN 50 AND 260), target_weight REAL CHECK(target_weight BETWEEN 20 AND 500),
 calorie_target INTEGER NOT NULL DEFAULT 1800 CHECK(calorie_target BETWEEN 500 AND 10000),
 gym_goal INTEGER NOT NULL DEFAULT 3 CHECK(gym_goal BETWEEN 1 AND 7), cardio_goal INTEGER NOT NULL DEFAULT 3 CHECK(cardio_goal BETWEEN 1 AND 7),
 unit TEXT NOT NULL DEFAULT 'kg' CHECK(unit IN ('kg','lb')), timezone TEXT NOT NULL DEFAULT 'UTC',
 theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('light','dark','system')),
 share_activity INTEGER NOT NULL DEFAULT 0 CHECK(share_activity IN (0,1)), share_weight INTEGER NOT NULL DEFAULT 0 CHECK(share_weight IN (0,1)), created_at INTEGER NOT NULL
);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE invitations (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL COLLATE NOCASE, expires_at INTEGER NOT NULL, used_by TEXT REFERENCES users(id), created_at INTEGER NOT NULL);
CREATE INDEX invitations_email ON invitations(email);
CREATE TABLE auth_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX auth_limits_expiry ON auth_limits(expires_at);
CREATE TABLE daily_logs (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL CHECK(date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
 gym TEXT NOT NULL CHECK(gym IN ('pending','done','missed','rest')), cardio TEXT NOT NULL CHECK(cardio IN ('pending','done','missed','rest')), diet TEXT NOT NULL CHECK(diet IN ('pending','done','missed','rest')),
 calories INTEGER CHECK(calories BETWEEN 0 AND 20000), calorie_target INTEGER NOT NULL CHECK(calorie_target BETWEEN 500 AND 10000), auto_diet INTEGER NOT NULL CHECK(auto_diet IN (0,1)),
 workout_start TEXT, workout_end TEXT, cardio_duration INTEGER CHECK(cardio_duration BETWEEN 0 AND 1440),
 cardio_notes TEXT NOT NULL, workout_notes TEXT NOT NULL, notes TEXT NOT NULL, food_photo TEXT, progress_photo TEXT, updated_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,date)
);
CREATE TABLE weight_logs (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, weight REAL NOT NULL CHECK(weight BETWEEN 20 AND 500), updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,date));
CREATE TABLE workouts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, name TEXT NOT NULL, duration INTEGER CHECK(duration BETWEEN 0 AND 1440), notes TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX workouts_user_date ON workouts(user_id,date);
CREATE TABLE workout_exercises (id TEXT PRIMARY KEY, workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE, position INTEGER NOT NULL, name TEXT NOT NULL, sets INTEGER NOT NULL CHECK(sets>0), reps INTEGER NOT NULL CHECK(reps>0), weight REAL NOT NULL CHECK(weight>=0), unit TEXT NOT NULL CHECK(unit IN ('kg','lb')), notes TEXT NOT NULL);
CREATE INDEX exercises_workout ON workout_exercises(workout_id,position);
