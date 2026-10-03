import type { User, DailyLog, WeightLog, Workout, Status } from '../../../packages/shared/model';
export type AppData = {
  user: User;
  today: string;
  logs: DailyLog[];
  weights: WeightLog[];
  workouts: Workout[];
  streak: number;
};
export type GroupPerson = {
  id: string;
  name: string;
  date: string;
  gym: Status;
  cardio: Status;
  diet: Status;
  streak: number;
  weightChange: number | null;
};
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-FitTrio-Request': '1' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('Unable to connect. Check your connection and try again.', 0);
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'The server returned an unexpected response. Please try again.',
      response.status,
    );
  }
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Please try again.';
    throw new ApiError(message, response.status);
  }
  return data as T;
}
