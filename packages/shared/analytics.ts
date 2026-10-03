import type { DailyLog, WeightLog, Workout } from './model';
export function todayIn(timezone:string, now = new Date()):string { return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function addDays(date:string,n:number):string { const d=new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
export function weekStart(date:string):string { const day=new Date(`${date}T12:00:00Z`).getUTCDay(); return addDays(date,-((day+6)%7)); }
export function daysBetween(from:string,to:string):number {return Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86400000)+1;}
export function successful(log:DailyLog):boolean { return [log.gym,log.cardio,log.diet].every(s=>s==='done'||s==='rest') && [log.gym,log.cardio,log.diet].some(s=>s==='done'); }
export function streak(logs:DailyLog[],today:string):number { const map=new Map(logs.map(l=>[l.date,l])); let d=today; if(!map.get(d)||!successful(map.get(d)!))d=addDays(d,-1); let count=0; while(map.get(d)&&successful(map.get(d)!)){count++;d=addDays(d,-1);} return count; }
export function movingAverage(weights:WeightLog[]):Array<WeightLog & {average:number}> {return weights.map((w,i)=>{const start=addDays(w.date,-6);const rows=weights.slice(0,i+1).filter(r=>r.date>=start);return {...w,average:rows.reduce((s,r)=>s+r.weight,0)/rows.length};});}
export function summarize(logs:DailyLog[],weights:WeightLog[],workouts:Workout[],from:string,to:string){
  const rows=logs.filter(l=>l.date>=from&&l.date<=to); const measurements=weights.filter(w=>w.date>=from&&w.date<=to); const sessions=workouts.filter(w=>w.date>=from&&w.date<=to);
  const days=daysBetween(from,to); const count=(key:'gym'|'cardio'|'diet')=>rows.filter(l=>l[key]==='done').length;
  const rest=(key:'gym'|'cardio'|'diet')=>rows.filter(l=>l[key]==='rest').length;
  const percentage=(key:'gym'|'cardio'|'diet')=>Math.round(100*count(key)/Math.max(1,days-rest(key)));
  const calories=rows.filter(l=>l.calories!==null); let bestStreak=0,current=0; const map=new Map(rows.map(l=>[l.date,l]));
  for(let d=from;d<=to;d=addDays(d,1)){current=map.get(d)&&successful(map.get(d)!)?current+1:0;bestStreak=Math.max(bestStreak,current);}
  const weightChange=measurements.length>=2?measurements.at(-1)!.weight-measurements[0].weight:null;
  const completed=count('gym')+count('cardio')+count('diet');const opportunities=3*days-rest('gym')-rest('cardio')-rest('diet');
  return {from,to,days,gym:count('gym'),cardio:count('cardio'),diet:count('diet'),gymPercent:percentage('gym'),cardioPercent:percentage('cardio'),dietPercent:percentage('diet'),adherence:Math.round(100*completed/Math.max(1,opportunities)),averageCalories:calories.length?Math.round(calories.reduce((s,l)=>s+l.calories!,0)/calories.length):null,weightChange,bestStreak,workoutCount:sessions.length,workoutMinutes:sessions.reduce((s,w)=>s+(w.duration??0),0)};
}
export type Summary = ReturnType<typeof summarize>;
