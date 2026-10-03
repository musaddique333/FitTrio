import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { hashPassword } from '../apps/api/security';
import { todayIn, addDays } from '../packages/shared/analytics';
if (process.argv.length > 2) throw new Error('Demo seeding is local-only. No flags are accepted.');
const vars = readFileSync('.dev.vars', 'utf8');
const pepper = vars.match(/^PASSWORD_PEPPER=(.+)$/m)?.[1];
if (!pepper) throw new Error('Run npm run setup first.');
const sql = (v: string | number | null) =>
  v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${v.replaceAll("'", "''")}'`;
const timestamp = Date.now(),
  today = todayIn('Europe/Dublin');
const statements = ['PRAGMA foreign_keys=ON;'];
const people = [
  { id: 'demo-alex', name: 'Alex Morgan', email: 'alex@fittrio.local', weight: 94, target: 85 },
  { id: 'demo-jamie', name: 'Jamie Patel', email: 'jamie@fittrio.local', weight: 78, target: 72 },
  { id: 'demo-sam', name: 'Sam Rivera', email: 'sam@fittrio.local', weight: 86, target: 80 },
];
for (const [pIndex, p] of people.entries()) {
  const hash = hashPassword('FitTrio-Demo-2026!', pepper);
  statements.push(
    `INSERT INTO users(id,email,name,password_hash,height,target_weight,calorie_target,timezone,share_activity,share_weight,created_at) VALUES (${[p.id, p.email, p.name, hash, 180, p.target, 1800, 'Europe/Dublin', 1, pIndex === 0 ? 1 : 0, timestamp].map(sql).join(',')}) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash;`,
  );
  for (let i = 29; i >= 0; i--) {
    const date = addDays(today, -i),
      done = i % 4 !== 0,
      gym = i % 3 === 0 ? 'rest' : done ? 'done' : 'missed',
      cardio = i % 5 === 0 ? 'rest' : done ? 'done' : 'pending',
      calories = 1650 + ((i * 37 + pIndex * 53) % 450);
    statements.push(
      `INSERT OR IGNORE INTO daily_logs (user_id,date,gym,cardio,diet,calories,calorie_target,auto_diet,workout_start,workout_end,cardio_duration,cardio_notes,workout_notes,notes,updated_at) VALUES (${[p.id, date, gym, cardio, calories <= 1800 ? 'done' : 'missed', calories, 1800, 1, gym === 'done' ? '17:30' : null, gym === 'done' ? '18:20' : null, cardio === 'done' ? 25 : null, 'Easy pace', gym === 'done' ? 'Felt stronger today.' : '', 'Small steps, every day.', timestamp].map(sql).join(',')});`,
    );
    statements.push(
      `INSERT OR IGNORE INTO weight_logs(user_id,date,weight,updated_at) VALUES (${[p.id, date, Number((p.weight - (29 - i) * 0.045 + Math.sin(i) * 0.3).toFixed(2)), timestamp].map(sql).join(',')});`,
    );
    if (gym === 'done') {
      const id = `${p.id}-workout-${date}`;
      statements.push(
        `INSERT OR IGNORE INTO workouts(id,user_id,date,name,duration,notes,created_at) VALUES (${[id, p.id, date, i % 2 ? 'Push day' : 'Full body', 50, 'Controlled tempo. Good session.', timestamp].map(sql).join(',')});`,
      );
      for (const [j, name] of ['Bench press', 'Goblet squat', 'Cable row'].entries())
        statements.push(
          `INSERT OR IGNORE INTO workout_exercises(id,workout_id,position,name,sets,reps,weight,unit,notes) VALUES (${[`${id}-${j}`, id, j, name, 3, 10, j === 0 ? 60 : 30, 'kg', ''].map(sql).join(',')});`,
        );
    }
  }
}
const path = '.wrangler/seed.local.sql';
writeFileSync(path, statements.join('\n'));
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'fittrio-db', '--local', '--file', path], {
    stdio: 'inherit',
  });
} finally {
  unlinkSync(path);
}
console.log(
  'Development only: alex@fittrio.local, jamie@fittrio.local, sam@fittrio.local / FitTrio-Demo-2026!',
);
