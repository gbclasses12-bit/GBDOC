export interface BatchItem {
  id: string;
  name: string;
  thumbnail: string;
  description: string;
  price: string | number;
  mrp: string | number;
  validity: string;
  startDate: string;
  endDate: string;
  folderWiseCourse: boolean;
}

export interface SubjectItem {
  id: string;
  name: string;
  image: string;
  parentId: string;
}

export interface ChapterItem {
  id: string;
  name: string;
  image: string;
  parentId: string;
  videosCount: number;
  pdfsCount: number;
}

export interface QualityOption {
  quality: string;
  url: string;
}

export interface LectureItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  published: string;
  free?: boolean;
  liveStatus?: number;
  hasPdf: boolean;
  streamUrl?: string;
  embedUrl?: string;
  qualities?: QualityOption[];
  videoId?: string;
  pdfUrl?: string;
  pdfKey?: string;
  isPdfEncrypted?: boolean;
}

export interface PdfItem {
  id: string;
  title: string;
  thumbnail: string;
  published: string;
  hasPdf: boolean;
  pdfUrl?: string;
  pdfKey?: string;
  isPdfEncrypted?: boolean;
}

export interface SubFolderItem {
  id: string;
  title: string;
  thumbnail: string;
}

export interface DishaUserCreds {
  userId: string;
  token: string;
  name?: string;
  mobile?: string;
}

const DISHA_DIRECT_API = 'https://dishaonlineclassesapi.classx.co.in';
const CREDS_KEY = 'disha_user_creds';

export function getSavedDishaCreds(): DishaUserCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId && parsed?.token) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export function saveDishaCreds(creds: DishaUserCreds): void {
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  fetch('/api/public/disha-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  }).catch(() => {});
}

export function clearDishaCreds(): void {
  localStorage.removeItem(CREDS_KEY);
}

export async function syncOwnerDishaCreds(): Promise<DishaUserCreds | null> {
  const existing = getSavedDishaCreds();
  if (existing) return existing;
  try {
    const res = await fetch('/api/public/disha-owner');
    const json = await res.json();
    if (json?.success && json?.data?.userId && json?.data?.token) {
      const creds: DishaUserCreds = {
        userId: String(json.data.userId),
        token: String(json.data.token),
        mobile: json.data.mobile || '',
        name: json.data.name || '',
      };
      localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
      return creds;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function loginDishaDirect(mobileOrEmail: string, password: string): Promise<DishaUserCreds> {
  const form = new FormData();
  form.append('email', mobileOrEmail.trim());
  form.append('password', password);
  const res = await fetch(`${DISHA_DIRECT_API}/post/userLogin?extra_details=0`, {
    method: 'POST',
    headers: {
      'Auth-Key': 'appxapi',
      'Client-Service': 'Appx',
      'source': 'website',
    },
    body: form,
  });
  const json = await res.json();
  if (json?.status !== 200 || !json?.data?.token) {
    throw new Error(json?.message || 'Login failed. Check your mobile/email and password.');
  }
  const creds: DishaUserCreds = {
    userId: String(json.data.userid || json.data.id || ''),
    token: String(json.data.token),
    name: json.data.name || '',
    mobile: json.data.phone || mobileOrEmail.trim(),
  };
  saveDishaCreds(creds);
  return creds;
}

// Browser WebCrypto AES-128-CBC Decryption for Disha strings ("cipherB64:ivB64")
let cachedCryptoKey: CryptoKey | null = null;
async function getDishaAesKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;
  const keyBytes = new TextEncoder().encode('638udh3829162018');
  cachedCryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
  return cachedCryptoKey;
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

export async function decryptDishaStringBrowser(enc: unknown): Promise<string> {
  if (!enc || typeof enc !== 'string' || !enc.includes(':')) {
    return typeof enc === 'string' ? enc : '';
  }
  try {
    const [cB64, ivB64] = enc.split(':');
    if (!cB64 || !ivB64) return '';
    const key = await getDishaAesKey();
    const cipher = base64ToUint8(cB64);
    const iv = base64ToUint8(ivB64);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv: iv.buffer as ArrayBuffer },
      key,
      cipher.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return '';
  }
}

export function decryptXor28PdfBytes(bytes: Uint8Array, keyStr?: string): Uint8Array {
  if (!bytes || bytes.length < 4) return bytes;
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return bytes;
  }
  if (!keyStr) return bytes;
  const out = new Uint8Array(bytes);
  const keyBytes = new TextEncoder().encode(keyStr);
  const limit = Math.min(28, out.length);
  for (let i = 0; i < limit; i++) {
    const mask = i < keyBytes.length ? keyBytes[i] : i;
    out[i] = (out[i] ^ mask) & 0xff;
  }
  return out;
}

function authHeaders(): Record<string, string> {
  const creds = getSavedDishaCreds();
  const h: Record<string, string> = {};
  if (creds?.token) h['x-disha-token'] = creds.token;
  if (creds?.userId) h['x-disha-userid'] = creds.userId;
  return h;
}

export async function fetchBatches(): Promise<{ count: number; data: BatchItem[] }> {
  const res = await fetch('/api/disha/batches', { headers: authHeaders() });
  const json = await res.json();
  if (json?.success && Array.isArray(json.data)) {
    return { count: json.count || json.data.length, data: json.data };
  }
  throw new Error(json?.error || 'Failed to load batches');
}

export async function fetchSubjects(batchId: string): Promise<{ count: number; data: SubjectItem[] }> {
  const res = await fetch(`/api/disha/subjects?batchId=${encodeURIComponent(batchId)}`, { headers: authHeaders() });
  const json = await res.json();
  if (json?.success && Array.isArray(json.data)) {
    return { count: json.count || json.data.length, data: json.data };
  }
  throw new Error(json?.error || 'Failed to load subjects');
}

export async function fetchChapters(batchId: string, subjectId: string): Promise<{ count: number; data: ChapterItem[] }> {
  const res = await fetch(
    `/api/disha/chapters?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectId)}`,
    { headers: authHeaders() }
  );
  const json = await res.json();
  if (json?.success && Array.isArray(json.data)) {
    return { count: json.count || json.data.length, data: json.data };
  }
  throw new Error(json?.error || 'Failed to load chapters');
}

export async function fetchLecturesAndPdfs(
  batchId: string,
  subjectId: string,
  chapterId: string
): Promise<{
  lectures: LectureItem[];
  pdfs: PdfItem[];
  subFolders: SubFolderItem[];
}> {
  const res = await fetch(
    `/api/disha/lectures?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectId)}&chapterId=${encodeURIComponent(chapterId)}`,
    { headers: authHeaders() }
  );
  const json = await res.json();
  if (json?.success) {
    return {
      lectures: Array.isArray(json.lectures) ? json.lectures : [],
      pdfs: Array.isArray(json.pdfs) ? json.pdfs : [],
      subFolders: Array.isArray(json.subFolders) ? json.subFolders : [],
    };
  }
  throw new Error(json?.error || 'Failed to load lectures');
}

export async function fetchVideoDetails(
  batchId: string,
  lectureId: string,
  chapterId?: string
): Promise<{
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  published: string;
  streamUrl: string;
  embedUrl: string;
  qualities: QualityOption[];
  videoId?: string;
  pdfUrl?: string;
  pdfKey?: string;
  hasPdf: boolean;
}> {
  const res = await fetch(
    `/api/disha/video?batchId=${encodeURIComponent(batchId)}&lectureId=${encodeURIComponent(lectureId)}&chapterId=${encodeURIComponent(chapterId || '')}`,
    { headers: authHeaders() }
  );
  const json = await res.json();
  if (json?.success && json.data) {
    return json.data;
  }
  throw new Error(json?.error || 'Failed to load video details');
}

export function buildOpenPdfNewTabUrl(
  batchId: string,
  lectureId: string,
  chapterId?: string,
  knownPdfUrl?: string,
  knownPdfKey?: string
): string {
  if (knownPdfUrl && !knownPdfUrl.includes('pdflink.com') && /^https?:\/\//i.test(knownPdfUrl)) {
    return `/api/disha/pdf-file?u=${encodeURIComponent(knownPdfUrl)}${
      knownPdfKey ? `&k=${encodeURIComponent(knownPdfKey)}` : ''
    }`;
  }
  const creds = getSavedDishaCreds();
  const params = new URLSearchParams({
    batchId: String(batchId || ''),
    lectureId: String(lectureId || ''),
    chapterId: String(chapterId || ''),
  });
  if (knownPdfUrl && !knownPdfUrl.includes('pdflink.com')) {
    params.set('u', knownPdfUrl);
  }
  if (knownPdfKey) {
    params.set('k', knownPdfKey);
  }
  if (creds?.token) {
    params.set('token', creds.token);
  }
  if (creds?.userId) {
    params.set('userId', creds.userId);
  }
  return `/api/disha/open-pdf?${params.toString()}`;
}

export async function resolvePdfUrl(
  batchId: string,
  lectureId: string,
  chapterId?: string,
  knownPdfUrl?: string,
  knownPdfKey?: string
): Promise<{ pdfUrl: string; rawPdfUrl: string; pdfKey: string; title: string }> {
  if (knownPdfUrl && !knownPdfUrl.includes('pdflink.com')) {
    const proxyUrl = `/api/disha/pdf-file?u=${encodeURIComponent(knownPdfUrl)}${knownPdfKey ? `&k=${encodeURIComponent(knownPdfKey)}` : ''}`;
    return {
      pdfUrl: proxyUrl,
      rawPdfUrl: knownPdfUrl,
      pdfKey: knownPdfKey || '',
      title: 'Notes PDF',
    };
  }
  const res = await fetch(
    `/api/disha/pdf?batchId=${encodeURIComponent(batchId)}&lectureId=${encodeURIComponent(lectureId)}&chapterId=${encodeURIComponent(chapterId || '')}`,
    { headers: authHeaders() }
  );
  const json = await res.json();
  if (json?.success && json.data?.pdfUrl) {
    return {
      pdfUrl: json.data.pdfUrl,
      rawPdfUrl: json.data.rawPdfUrl || json.data.pdfUrl,
      pdfKey: json.data.pdfKey || '',
      title: json.data.title || 'Notes PDF',
    };
  }
  throw new Error(json?.error || 'Could not resolve PDF URL');
}
