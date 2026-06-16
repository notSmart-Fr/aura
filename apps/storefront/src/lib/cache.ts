export interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMinutes: number = 10) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  public get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  public set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs,
    });
  }

  public clear(): void {
    this.cache.clear();
  }
}

// Global singleton to survive Next.js dev hot-reloads
const globalForCache = globalThis as unknown as {
  searchCache?: MemoryCache<any>;
};

export const searchCache = globalForCache.searchCache ?? new MemoryCache<any>(10);

if (process.env.NODE_ENV !== "production") {
  globalForCache.searchCache = searchCache;
}
