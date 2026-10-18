interface LockEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, LockEntry>();
const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

function getKey(employeeNo: string, ip: string): string {
  return `${employeeNo}:${ip}`;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.lockedUntil > 0 && entry.lockedUntil < now) {
      loginAttempts.delete(key);
    } else if (entry.lockedUntil === 0 && now - entry.firstAttempt > 30 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

export function checkLoginLock(employeeNo: string, ip: string): { locked: boolean; remainingSeconds: number } {
  const key = getKey(employeeNo, ip);
  const entry = loginAttempts.get(key);
  
  if (!entry) return { locked: false, remainingSeconds: 0 };
  
  if (entry.lockedUntil > 0) {
    const remaining = entry.lockedUntil - Date.now();
    if (remaining > 0) {
      return { locked: true, remainingSeconds: Math.ceil(remaining / 1000) };
    }
    loginAttempts.delete(key);
    return { locked: false, remainingSeconds: 0 };
  }
  
  return { locked: false, remainingSeconds: 0 };
}

export function recordFailedAttempt(employeeNo: string, ip: string): void {
  const key = getKey(employeeNo, ip);
  const now = Date.now();
  let entry = loginAttempts.get(key);
  
  if (!entry || (entry.lockedUntil > 0 && entry.lockedUntil < now)) {
    entry = { attempts: 0, firstAttempt: now, lockedUntil: 0 };
  }
  
  entry.attempts += 1;
  
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_DURATION;
  }
  
  loginAttempts.set(key, entry);
}

export function clearLock(employeeNo: string, ip?: string): void {
  if (ip) {
    loginAttempts.delete(getKey(employeeNo, ip));
  } else {
    for (const [key] of loginAttempts.entries()) {
      if (key.startsWith(`${employeeNo}:`)) {
        loginAttempts.delete(key);
      }
    }
  }
}

export function getAttemptCount(employeeNo: string, ip: string): number {
  const key = getKey(employeeNo, ip);
  const entry = loginAttempts.get(key);
  if (!entry) return 0;
  if (entry.lockedUntil > 0 && entry.lockedUntil < Date.now()) return 0;
  return entry.attempts;
}
