import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
const bool = (name: string) => integer(name, { mode: 'boolean' });
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  height: real('height'),
  targetWeight: real('target_weight'),
  calorieTarget: integer('calorie_target').notNull().default(1800),
  gymGoal: integer('gym_goal').notNull().default(3),
  cardioGoal: integer('cardio_goal').notNull().default(3),
  unit: text('unit', { enum: ['kg', 'lb'] })
    .notNull()
    .default('kg'),
  timezone: text('timezone').notNull().default('UTC'),
  theme: text('theme', { enum: ['light', 'dark', 'system'] })
    .notNull()
    .default('system'),
  shareActivity: bool('share_activity').notNull().default(false),
  shareWeight: bool('share_weight').notNull().default(false),
  createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('sessions_user').on(t.userId), index('sessions_expiry').on(t.expiresAt)],
);
export const dailyLogs = sqliteTable(
  'daily_logs',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    gym: text('gym', { enum: ['pending', 'done', 'missed', 'rest'] }).notNull(),
    cardio: text('cardio', { enum: ['pending', 'done', 'missed', 'rest'] }).notNull(),
    diet: text('diet', { enum: ['pending', 'done', 'missed', 'rest'] }).notNull(),
    calories: integer('calories'),
    calorieTarget: integer('calorie_target').notNull(),
    autoDiet: bool('auto_diet').notNull(),
    workoutStart: text('workout_start'),
    workoutEnd: text('workout_end'),
    cardioDuration: integer('cardio_duration'),
    cardioNotes: text('cardio_notes').notNull(),
    workoutNotes: text('workout_notes').notNull(),
    notes: text('notes').notNull(),
    foodPhoto: text('food_photo'),
    progressPhoto: text('progress_photo'),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);
export const weightLogs = sqliteTable(
  'weight_logs',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    weight: real('weight').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);
export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    name: text('name').notNull(),
    duration: integer('duration'),
    notes: text('notes').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('workouts_user_date').on(t.userId, t.date)],
);
export const exercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    sets: integer('sets').notNull(),
    reps: integer('reps').notNull(),
    weight: real('weight').notNull(),
    unit: text('unit', { enum: ['kg', 'lb'] }).notNull(),
    notes: text('notes').notNull(),
  },
  (t) => [index('exercises_workout').on(t.workoutId, t.position)],
);
