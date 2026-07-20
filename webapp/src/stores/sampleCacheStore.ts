import { defineStore } from "pinia";
import { openDB, type IDBPDatabase } from "idb";

interface CachedSample {
  id: string;
  buffer: ArrayBuffer;
  cachedAt: number;
  size: number;
}

const DB_NAME = "bloop-sample-cache";
const DB_VERSION = 1;
const STORE_NAME = "samples";
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB

export const useSampleCacheStore = defineStore("sampleCache", {
  state: () => ({
    db: null as IDBPDatabase | null,
    isInitialized: false,
    cacheSize: 0,
  }),

  actions: {
    async initialize(): Promise<void> {
      if (this.isInitialized) return;

      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("cachedAt", "cachedAt");
          }
        },
      });

      await this.calculateCacheSize();
      this.isInitialized = true;
    },

    async get(sampleId: string): Promise<ArrayBuffer | null> {
      if (!this.db) return null;

      const cached = (await this.db.get(STORE_NAME, sampleId)) as
        CachedSample | undefined;
      if (cached) {
        cached.cachedAt = Date.now();
        await this.db.put(STORE_NAME, cached);
        return cached.buffer;
      }
      return null;
    },

    async set(sampleId: string, buffer: ArrayBuffer): Promise<void> {
      if (!this.db) return;

      await this.ensureSpace(buffer.byteLength);

      const entry: CachedSample = {
        id: sampleId,
        buffer,
        cachedAt: Date.now(),
        size: buffer.byteLength,
      };
      await this.db.put(STORE_NAME, entry);
      this.cacheSize += buffer.byteLength;
    },

    async ensureSpace(needed: number): Promise<void> {
      if (!this.db) return;

      while (this.cacheSize + needed > MAX_CACHE_SIZE) {
        const tx = this.db.transaction(STORE_NAME, "readwrite");
        const index = tx.store.index("cachedAt");
        const cursor = await index.openCursor();

        if (cursor) {
          const entry = cursor.value as CachedSample;
          this.cacheSize -= entry.size;
          await cursor.delete();
        } else {
          break;
        }
      }
    },

    async calculateCacheSize(): Promise<void> {
      if (!this.db) return;

      let total = 0;
      const all = (await this.db.getAll(STORE_NAME)) as CachedSample[];
      for (const entry of all) {
        total += entry.size;
      }
      this.cacheSize = total;
    },

    async clear(): Promise<void> {
      if (!this.db) return;
      await this.db.clear(STORE_NAME);
      this.cacheSize = 0;
    },

    async has(sampleId: string): Promise<boolean> {
      if (!this.db) return false;
      const key = await this.db.getKey(STORE_NAME, sampleId);
      return key !== undefined;
    },
  },
});
