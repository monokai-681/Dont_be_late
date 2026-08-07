import type { MechanicId } from './model';

const DISCOVERED_KEY = 'dont-be-late:discovered-mechanics';
const SEEN_KEY = 'dont-be-late:tutorial-seen';

function readSet(key: string): Set<MechanicId> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, values: Set<MechanicId>): void {
  localStorage.setItem(key, JSON.stringify([...values]));
}

export function loadDiscovered(): Set<MechanicId> {
  return readSet(DISCOVERED_KEY);
}

export function loadTutorialSeen(): Set<MechanicId> {
  return readSet(SEEN_KEY);
}

export function saveDiscovered(values: Set<MechanicId>): void {
  writeSet(DISCOVERED_KEY, values);
}

export function saveTutorialSeen(values: Set<MechanicId>): void {
  writeSet(SEEN_KEY, values);
}

export function resetTutorialSeen(): void {
  localStorage.removeItem(SEEN_KEY);
}
