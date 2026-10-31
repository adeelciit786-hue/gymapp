CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  active BOOLEAN NOT NULL DEFAULT true,
  session_version INTEGER NOT NULL DEFAULT 0 CHECK (session_version >= 0),
  weekly_goal_workouts SMALLINT NOT NULL DEFAULT 3 CHECK (weekly_goal_workouts BETWEEN 1 AND 7),
  weekly_goal_minutes SMALLINT NOT NULL DEFAULT 150 CHECK (weekly_goal_minutes BETWEEN 1 AND 2000),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'coach', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_case_insensitive ON users (lower(email));

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL CHECK (muscle_group IN ('Chest', 'Back', 'Legs', 'Arms', 'Core', 'Cardio')),
  sets SMALLINT NOT NULL CHECK (sets BETWEEN 1 AND 20),
  reps TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  rest_seconds SMALLINT NOT NULL DEFAULT 0 CHECK (rest_seconds >= 0),
  description TEXT NOT NULL,
  equipment TEXT NOT NULL,
  instructions TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed')),
  duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index SMALLINT NOT NULL CHECK (order_index >= 0),
  UNIQUE (workout_id, exercise_id),
  UNIQUE (workout_id, order_index)
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number SMALLINT NOT NULL CHECK (set_number > 0),
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  reps SMALLINT CHECK (reps IS NULL OR reps >= 0),
  weight_kg NUMERIC(7, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  UNIQUE (workout_exercise_id, set_number)
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  coach_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 300),
  capacity SMALLINT NOT NULL CHECK (capacity > 0),
  booked_count SMALLINT NOT NULL DEFAULT 0 CHECK (booked_count >= 0 AND booked_count <= capacity),
  intensity TEXT NOT NULL CHECK (intensity IN ('Easy', 'Medium', 'Hard')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  UNIQUE (title, start_time)
);

CREATE TABLE IF NOT EXISTS class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_status TEXT NOT NULL DEFAULT 'booked' CHECK (booking_status IN ('booked', 'cancelled')),
  attendance_status TEXT NOT NULL DEFAULT 'unknown' CHECK (attendance_status IN ('unknown', 'attended', 'no_show')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS class_bookings_one_active_per_member
  ON class_bookings(class_id, user_id) WHERE booking_status = 'booked';
CREATE INDEX IF NOT EXISTS class_bookings_user_upcoming
  ON class_bookings(user_id, booking_status, class_id);

CREATE TABLE IF NOT EXISTS membership_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price NUMERIC(9, 2) NOT NULL CHECK (price >= 0),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
  features TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES membership_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  start_date DATE,
  end_date DATE
);
CREATE UNIQUE INDEX IF NOT EXISTS user_memberships_one_pending_or_active
  ON user_memberships(user_id) WHERE status IN ('pending', 'active');

CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  record_type TEXT NOT NULL CHECK (record_type IN ('weight', 'repetitions', 'duration')),
  record_value NUMERIC(9, 2) NOT NULL CHECK (record_value > 0),
  record_unit TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_id, record_type, record_value, achieved_at)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  fitness_goal TEXT NOT NULL DEFAULT 'General Fitness',
  experience_level TEXT NOT NULL DEFAULT 'Beginner' CHECK (experience_level IN ('Beginner', 'Intermediate', 'Advanced')),
  preferred_training_days TEXT[] NOT NULL DEFAULT '{}',
  profile_image_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workouts_user_date ON workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS workout_exercises_workout_order ON workout_exercises(workout_id, order_index);
CREATE INDEX IF NOT EXISTS workout_sets_exercise_set ON workout_sets(workout_exercise_id, set_number);
CREATE INDEX IF NOT EXISTS classes_start_time ON classes(start_time);
CREATE INDEX IF NOT EXISTS notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS personal_records_user_achieved ON personal_records(user_id, achieved_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
  CHECK (role IN ('member', 'coach', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0
  CHECK (session_version >= 0);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE classes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'cancelled'));
ALTER TABLE class_bookings ADD COLUMN IF NOT EXISTS attendance_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (attendance_status IN ('unknown', 'attended', 'no_show'));

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  goal TEXT NOT NULL DEFAULT 'General Fitness',
  experience_level TEXT NOT NULL DEFAULT 'Beginner' CHECK (experience_level IN ('Beginner', 'Intermediate', 'Advanced')),
  training_days TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  order_index SMALLINT NOT NULL CHECK (order_index >= 0),
  sets SMALLINT NOT NULL DEFAULT 3 CHECK (sets BETWEEN 1 AND 20),
  reps TEXT NOT NULL DEFAULT '8-12',
  rest_seconds SMALLINT NOT NULL DEFAULT 60 CHECK (rest_seconds BETWEEN 0 AND 900),
  UNIQUE (template_id, exercise_id),
  UNIQUE (template_id, order_index)
);
CREATE INDEX IF NOT EXISTS workout_templates_user_updated ON workout_templates(user_id, updated_at DESC);

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS nutrition_targets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calories INTEGER NOT NULL DEFAULT 2200 CHECK (calories BETWEEN 1 AND 10000),
  protein NUMERIC(7,2) NOT NULL DEFAULT 150 CHECK (protein BETWEEN 1 AND 1000),
  carbohydrates NUMERIC(7,2) NOT NULL DEFAULT 250 CHECK (carbohydrates BETWEEN 1 AND 1000),
  fat NUMERIC(7,2) NOT NULL DEFAULT 70 CHECK (fat BETWEEN 1 AND 1000),
  water_ml INTEGER NOT NULL DEFAULT 2000 CHECK (water_ml BETWEEN 1 AND 20000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS food_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  calories NUMERIC(9,2) NOT NULL CHECK (calories BETWEEN 0 AND 10000),
  protein NUMERIC(7,2) NOT NULL CHECK (protein BETWEEN 0 AND 1000),
  carbohydrates NUMERIC(7,2) NOT NULL CHECK (carbohydrates BETWEEN 0 AND 1000),
  fat NUMERIC(7,2) NOT NULL CHECK (fat BETWEEN 0 AND 1000),
  serving_description TEXT NOT NULL,
  illustrative BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS food_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snacks')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  servings NUMERIC(7,2) NOT NULL DEFAULT 1 CHECK (servings > 0 AND servings <= 100),
  calories NUMERIC(9,2) NOT NULL CHECK (calories BETWEEN 0 AND 10000),
  protein NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (protein BETWEEN 0 AND 1000),
  carbohydrates NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (carbohydrates BETWEEN 0 AND 1000),
  fat NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (fat BETWEEN 0 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS food_entries_user_day ON food_entries(user_id, entry_date DESC);
CREATE TABLE IF NOT EXISTS water_logs (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_ml INTEGER NOT NULL CHECK (amount_ml BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date, created_at)
);
ALTER TABLE water_logs ADD COLUMN IF NOT EXISTS id BIGINT GENERATED BY DEFAULT AS IDENTITY;
CREATE UNIQUE INDEX IF NOT EXISTS water_logs_id_unique ON water_logs(id);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{"theme":"dark","reducedMotion":false,"notifications":true,"restTimerSeconds":60,"units":"metric"}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(preferences) = 'object')
);

CREATE TABLE IF NOT EXISTS achievement_catalog (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criterion TEXT NOT NULL,
  threshold INTEGER NOT NULL CHECK (threshold > 0)
);
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievement_catalog(id) ON DELETE RESTRICT,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  record_type TEXT NOT NULL,
  record_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created ON audit_logs(created_at DESC);
