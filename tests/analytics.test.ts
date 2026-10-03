import { describe, expect, it } from 'vitest';
import {
  addDays,
  movingAverage,
  streak,
  summarize,
  todayIn,
  weekStart,
} from '../packages/shared/analytics';
import {
  dateSchema,
  emptyLog,
  logSchema,
  profileSchema,
  type DailyLog,
} from '../packages/shared/model';
const log = (date: string, fields: Partial<DailyLog> = {}): DailyLog => ({
  ...emptyLog(1800),
  date,
  userId: 'a',
  updatedAt: 0,
  ...fields,
});
describe('calendar and analytics', () => {
  it('handles leap dates and timezone boundaries', () => {
    expect(dateSchema.safeParse('2025-02-29').success).toBe(false);
    expect(dateSchema.safeParse('2024-02-29').success).toBe(true);
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(weekStart('2026-10-04')).toBe('2026-09-28');
    expect(todayIn('Asia/Kolkata', new Date('2026-10-03T23:30:00Z'))).toBe('2026-10-04');
  });
  it('excludes rest opportunities but counts unlogged dates', () => {
    const rows = [
      log('2026-10-01', { gym: 'done', cardio: 'rest', diet: 'done', calories: 1600 }),
      log('2026-10-02', { gym: 'rest', cardio: 'done', diet: 'missed', calories: 2000 }),
    ];
    const s = summarize(rows, [], [], '2026-10-01', '2026-10-03');
    expect(s.adherence).toBe(43);
    expect(s.gymPercent).toBe(50);
    expect(s.averageCalories).toBe(1800);
    expect(s.weightChange).toBeNull();
  });
  it('keeps yesterday’s streak until today is completed', () => {
    const complete = { gym: 'rest' as const, cardio: 'done' as const, diet: 'done' as const };
    expect(streak([log('2026-10-01', complete), log('2026-10-02', complete)], '2026-10-03')).toBe(
      2,
    );
    expect(streak([log('2026-10-01', complete)], '2026-10-03')).toBe(0);
    expect(
      streak([log('2026-10-03', { gym: 'rest', cardio: 'rest', diet: 'rest' })], '2026-10-03'),
    ).toBe(0);
  });
  it('averages calendar days rather than seven measurements', () => {
    expect(
      movingAverage([
        { date: '2026-09-01', weight: 100 },
        { date: '2026-10-01', weight: 90 },
        { date: '2026-10-03', weight: 88 },
      ]).at(-1)?.average,
    ).toBe(89);
  });
  it('rejects unsafe photos and invalid timezones', () => {
    expect(
      logSchema.safeParse({ ...emptyLog(1800), foodPhoto: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(profileSchema.shape.timezone.safeParse('Not/AZone').success).toBe(false);
  });
});
