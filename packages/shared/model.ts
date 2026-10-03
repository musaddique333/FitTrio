import { z } from 'zod';
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Enter a valid calendar date');
export const stateSchema = z.enum(['pending', 'done', 'missed', 'rest']);
const nullableNumber = (min: number, max: number) =>
  z.number().finite().min(min).max(max).nullable();
const photo = z
  .string()
  .max(2048)
  .url()
  .refine((v) => v.startsWith('https://'), 'Use an HTTPS link')
  .or(z.literal(''))
  .transform((v) => v || null)
  .nullable();
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
  .or(z.literal(''))
  .transform((v) => v || null)
  .nullable();
export const logSchema = z
  .object({
    gym: stateSchema,
    cardio: stateSchema,
    diet: stateSchema,
    calories: nullableNumber(0, 20000),
    calorieTarget: z.number().int().min(500).max(10000),
    autoDiet: z.boolean(),
    weight: nullableNumber(20, 500),
    workoutStart: time,
    workoutEnd: time,
    cardioDuration: nullableNumber(0, 1440),
    cardioNotes: z.string().max(2000),
    workoutNotes: z.string().max(4000),
    notes: z.string().max(4000),
    foodPhoto: photo,
    progressPhoto: photo,
  })
  .strict();
export const exerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    sets: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000),
    weight: z.number().min(0).max(2000),
    unit: z.enum(['kg', 'lb']),
    notes: z.string().max(1000),
  })
  .strict();
export const workoutSchema = z
  .object({
    date: dateSchema,
    name: z.string().trim().min(1).max(120),
    duration: nullableNumber(0, 1440),
    notes: z.string().max(4000),
    exercises: z.array(exerciseSchema).min(1).max(30),
  })
  .strict();
export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    height: nullableNumber(50, 260),
    targetWeight: nullableNumber(20, 500),
    calorieTarget: z.number().int().min(500).max(10000),
    gymGoal: z.number().int().min(1).max(7),
    cardioGoal: z.number().int().min(1).max(7),
    unit: z.enum(['kg', 'lb']),
    timezone: z
      .string()
      .max(80)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, 'Invalid timezone'),
    theme: z.enum(['light', 'dark', 'system']),
    shareActivity: z.boolean(),
    shareWeight: z.boolean(),
  })
  .strict();
export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128),
});
export const registerSchema = credentialsSchema
  .extend({ name: z.string().trim().min(1).max(80), invite: z.string().min(20).max(200) })
  .strict();
export type Status = z.infer<typeof stateSchema>;
export type DailyInput = z.infer<typeof logSchema>;
export type DailyLog = DailyInput & { date: string; userId: string; updatedAt: number };
export type ProfileInput = z.infer<typeof profileSchema>;
export type User = ProfileInput & { id: string; email: string; createdAt: number };
export type WeightLog = { date: string; weight: number };
export type WorkoutInput = z.infer<typeof workoutSchema>;
export type Workout = WorkoutInput & { id: string; userId: string; createdAt: number };
export function emptyLog(calorieTarget: number): DailyInput {
  return {
    gym: 'pending',
    cardio: 'pending',
    diet: 'pending',
    calories: null,
    calorieTarget,
    autoDiet: true,
    weight: null,
    workoutStart: null,
    workoutEnd: null,
    cardioDuration: null,
    cardioNotes: '',
    workoutNotes: '',
    notes: '',
    foodPhoto: null,
    progressPhoto: null,
  };
}
export const kgToUnit = (value: number, unit: 'kg' | 'lb') =>
  unit === 'lb' ? value * 2.2046226218 : value;
export const unitToKg = (value: number, unit: 'kg' | 'lb') =>
  unit === 'lb' ? value / 2.2046226218 : value;
