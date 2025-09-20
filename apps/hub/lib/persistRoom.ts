import { putRoom } from '@/lib/roomsStore';
import { putRoomRedis } from '@/lib/roomsRedis';
import type { Room } from '@/types/room';

const NO_DB_ERROR = 'no-db';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout'));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function isNoDbError(error: unknown): boolean {
  return error instanceof Error && error.message === NO_DB_ERROR;
}

type PersistOutcome = 'success' | 'missing' | 'failed';

interface PersistOptions {
  firestoreTimeoutMs?: number;
}

async function persistToFirestore(room: Room, context: string, options: PersistOptions): Promise<PersistOutcome> {
  try {
    if (options.firestoreTimeoutMs) {
      await withTimeout(putRoom(room), options.firestoreTimeoutMs);
    } else {
      await putRoom(room);
    }
    return 'success';
  } catch (error) {
    if (isNoDbError(error)) {
      return 'missing';
    }
    console.warn(`[persistRoom:${context}] Firestore persistence failed:`, error);
    return 'failed';
  }
}

async function persistToRedis(room: Room, context: string): Promise<PersistOutcome> {
  try {
    const persisted = await putRoomRedis(room);
    if (!persisted) {
      return 'missing';
    }
    return 'success';
  } catch (error) {
    console.warn(`[persistRoom:${context}] Redis persistence failed:`, error);
    return 'failed';
  }
}

export async function persistRoomToStores(
  room: Room,
  context: string,
  options: PersistOptions = {}
): Promise<void> {
  const [firestoreOutcome, redisOutcome] = await Promise.all([
    persistToFirestore(room, context, options),
    persistToRedis(room, context),
  ]);

  const successes = [firestoreOutcome, redisOutcome].filter((outcome) => outcome === 'success').length;
  const attempts = [firestoreOutcome, redisOutcome].filter((outcome) => outcome !== 'missing').length;

  if (successes === 0) {
    const error = new Error(attempts === 0 ? 'persist-unavailable' : 'persist-failed');
    throw error;
  }
}
