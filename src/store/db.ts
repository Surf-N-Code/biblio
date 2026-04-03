"use client";

export type FeatureRequest = {
  id: string;
  description: string;
  status:
    | "pending"
    | "building"
    | "ready"
    | "approved"
    | "deployed"
    | "rejected"
    | "failed";
  buildStep?: string;
  branchName?: string;
  createdAt: number;
  updatedAt: number;
  prNumber?: number;
  prUrl?: string;
  previewUrl?: string;
};

const DB_NAME = "biblio-builder";
const STORE = "features";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error("indexedDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
  });
}

export async function getFeatureRequests(): Promise<FeatureRequest[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const os = tx.objectStore(STORE);
    const r = os.getAll();
    r.onerror = () => reject(r.error ?? new Error("getAll failed"));
    r.onsuccess = () => resolve((r.result as FeatureRequest[]) ?? []);
  });
}

export async function saveFeatureRequest(feature: FeatureRequest): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const os = tx.objectStore(STORE);
    const r = os.put(feature);
    r.onerror = () => reject(r.error ?? new Error("put failed"));
    r.onsuccess = () => resolve();
  });
}
