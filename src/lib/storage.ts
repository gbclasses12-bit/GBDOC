import { BatchItem } from './dishaApi';

const WISHLIST_KEY = 'gb_study_wishlist_v1';
const DB_NAME = 'gb_offline_downloads';
const STORE_NAME = 'items';

export interface OfflineItem {
  id: string;
  type: 'pdf' | 'video';
  title: string;
  batchName?: string;
  subjectName?: string;
  createdAt: number;
  size: number;
  mimeType: string;
  blob: Blob;
}

export function getWishlistBatches(): BatchItem[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isBatchWishlisted(batchId: string): boolean {
  return getWishlistBatches().some((b) => String(b.id) === String(batchId));
}

export function toggleWishlistBatch(batch: BatchItem): BatchItem[] {
  const current = getWishlistBatches();
  const exists = current.some((b) => String(b.id) === String(batch.id));
  const next = exists ? current.filter((b) => String(b.id) !== String(batch.id)) : [batch, ...current];
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
  return next;
}

function openDownloadsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveOfflineDownload(item: OfflineItem): Promise<void> {
  const db = await openDownloadsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getOfflineDownloads(): Promise<OfflineItem[]> {
  try {
    const db = await openDownloadsDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as OfflineItem[];
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function deleteOfflineDownload(id: string): Promise<void> {
  const db = await openDownloadsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
