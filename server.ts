import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISHA_API = 'https://dishaonlineclassesapi.classx.co.in';
const UPSTREAM_WORKER = 'https://bat.doc1.workers.dev';
const UPSTREAM_BACKEND = 'https://batdisha.lovable.app';
const AES_KEY = Buffer.from('638udh3829162018', 'utf8');

const WORKER_HEADERS = {
  'Origin': 'https://bat.doc1.workers.dev',
  'Referer': 'https://bat.doc1.workers.dev/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

interface DishaOwnerSession {
  userId: string;
  token: string;
  mobile?: string;
  name?: string;
  updated_at: string;
}

let savedOwnerSession: DishaOwnerSession | null = null;
const SESSION_FILE = path.join('/tmp', 'gb_study_disha_session.json');
try {
  if (fs.existsSync(SESSION_FILE)) {
    savedOwnerSession = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  }
} catch {
  // ignore
}

// Upstream GB-Token & per-batch Disha Owner Token cache
let cachedGbToken: { token: string; expiresAt: number } | null = null;
const batchOwnerCache = new Map<string, { userId: string; token: string; fetchedAt: number }>();

async function getUpstreamGbToken(force = false): Promise<string> {
  const now = Date.now();
  if (!force && cachedGbToken && cachedGbToken.expiresAt - 30000 > now) {
    return cachedGbToken.token;
  }
  const res = await fetch(`${UPSTREAM_BACKEND}/api/public/gb-auth`, {
    headers: WORKER_HEADERS,
  });
  if (!res.ok) {
    throw new Error(`gb-auth HTTP ${res.status}`);
  }
  const json: any = await res.json();
  cachedGbToken = {
    token: String(json.token || ''),
    expiresAt: Number(json.expires_at || now + 600000),
  };
  return cachedGbToken.token;
}

async function getBatchOwnerCreds(batchId: string): Promise<{ userId: string; token: string } | null> {
  const cleanId = String(batchId || '').trim();
  if (!cleanId) return null;

  const cached = batchOwnerCache.get(cleanId);
  if (cached && Date.now() - cached.fetchedAt < 15 * 60 * 1000) {
    return { userId: cached.userId, token: cached.token };
  }

  try {
    const gbToken = await getUpstreamGbToken();
    const res = await fetch(`${UPSTREAM_BACKEND}/api/public/disha-owner?batch_id=${encodeURIComponent(cleanId)}`, {
      headers: {
        ...WORKER_HEADERS,
        'X-GB-Token': gbToken,
      },
    });
    if (res.ok) {
      const json: any = await res.json();
      if (json?.ok && json?.userId && json?.token) {
        const entry = {
          userId: String(json.userId),
          token: String(json.token),
          fetchedAt: Date.now(),
        };
        batchOwnerCache.set(cleanId, entry);
        return { userId: entry.userId, token: entry.token };
      }
    }
  } catch {
    // ignore and fallback below
  }

  // Fallback to default known unlocked batch owners (87, 61, 86, 57, 88, 89)
  for (const fallbackBid of ['87', '61', '86', '57', '88', '89']) {
    if (fallbackBid === cleanId) continue;
    const fbCached = batchOwnerCache.get(fallbackBid);
    if (fbCached) return { userId: fbCached.userId, token: fbCached.token };
    try {
      const gbToken = await getUpstreamGbToken();
      const res = await fetch(`${UPSTREAM_BACKEND}/api/public/disha-owner?batch_id=${fallbackBid}`, {
        headers: {
          ...WORKER_HEADERS,
          'X-GB-Token': gbToken,
        },
      });
      if (res.ok) {
        const json: any = await res.json();
        if (json?.ok && json?.userId && json?.token) {
          const entry = {
            userId: String(json.userId),
            token: String(json.token),
            fetchedAt: Date.now(),
          };
          batchOwnerCache.set(fallbackBid, entry);
          return { userId: entry.userId, token: entry.token };
        }
      }
    } catch {
      // continue
    }
  }

  if (savedOwnerSession?.userId && savedOwnerSession?.token) {
    return { userId: savedOwnerSession.userId, token: savedOwnerSession.token };
  }
  return null;
}

function decryptDishaField(encrypted: unknown): string {
  if (!encrypted || typeof encrypted !== 'string' || !encrypted.includes(':')) {
    return typeof encrypted === 'string' ? encrypted : '';
  }
  try {
    const [cipherB64, ivB64] = encrypted.split(':');
    if (!cipherB64 || !ivB64) return '';
    const cipherBytes = Buffer.from(cipherB64, 'base64');
    const ivBytes = Buffer.from(ivB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', AES_KEY, ivBytes);
    const decrypted = Buffer.concat([decipher.update(cipherBytes), decipher.final()]);
    return decrypted.toString('utf8').trim();
  } catch {
    return '';
  }
}

function decryptXor28Pdf(buffer: Buffer, keyStr: string): Buffer {
  if (!buffer || buffer.length < 4) return buffer;
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return buffer;
  }
  if (!keyStr) return buffer;
  const out = Buffer.from(buffer);
  const keyBytes = Buffer.from(keyStr, 'utf8');
  const limit = Math.min(28, out.length);
  for (let i = 0; i < limit; i++) {
    const mask = i < keyBytes.length ? keyBytes[i] : i;
    out[i] = (out[i] ^ mask) & 0xff;
  }
  return out;
}

function buildDishaHeaders(token?: string, userId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Auth-Key': 'appxapi',
    'Client-Service': 'Appx',
    'source': 'website',
    'User-Agent': WORKER_HEADERS['User-Agent'],
  };
  const activeToken = token || savedOwnerSession?.token;
  const activeUserId = userId || savedOwnerSession?.userId;
  if (activeToken) headers['Authorization'] = activeToken;
  if (activeUserId) headers['User-ID'] = activeUserId;
  return headers;
}

async function dishaGet(endpoint: string, token?: string, userId?: string): Promise<any> {
  const res = await fetch(`${DISHA_API}${endpoint}`, {
    headers: buildDishaHeaders(token, userId),
  });
  if (!res.ok) {
    throw new Error(`Disha API HTTP ${res.status}`);
  }
  return res.json();
}

function isRealMediaUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host !== 'pdflink.com' &&
      host !== 'www.pdflink.com' &&
      host !== 'videolink.com' &&
      host !== 'www.videolink.com'
    );
  } catch {
    return false;
  }
}

function extractVideoUrlsFromRaw(raw: any) {
  const qualities: Array<{ quality: string; url: string }> = [];
  let streamUrl = '';
  let embedUrl = '';
  let playerUrl = '';

  // 1. Check encrypted_links (skip /hls-drm- because those require Appx combined-img-player via /api/disha-player)
  const encLinks = Array.isArray(raw?.encrypted_links) ? raw.encrypted_links : [];
  for (const link of encLinks) {
    const p = decryptDishaField(link?.path);
    const q = link?.quality || 'Auto';
    if (p && isRealMediaUrl(p) && !/\/hls-drm-/i.test(p)) {
      qualities.push({ quality: String(q), url: p });
      if (!streamUrl) streamUrl = p;
    }
  }

  // 2. Check download_link and file_link
  const dlRaw = raw?.download_link;
  if (dlRaw) {
    const dec = String(dlRaw).includes(':') && !String(dlRaw).startsWith('http') ? decryptDishaField(dlRaw) : String(dlRaw).trim();
    if (dec && /^https?:\/\//i.test(dec) && isRealMediaUrl(dec) && !/\/hls-drm-/i.test(dec)) {
      if (!streamUrl) streamUrl = dec;
      if (!qualities.some((q) => q.url === dec)) {
        qualities.push({ quality: 'Download', url: dec });
      }
    }
  }

  let youtubeId = '';
  const flRaw = raw?.file_link;
  if (flRaw) {
    const dec = String(flRaw).includes(':') && !String(flRaw).startsWith('http') ? decryptDishaField(flRaw) : String(flRaw).trim();
    if (dec && /^https?:\/\//i.test(dec) && isRealMediaUrl(dec) && !/\/hls-drm-/i.test(dec)) {
      if (!streamUrl) streamUrl = dec;
      if (!qualities.some((q) => q.url === dec)) {
        qualities.push({ quality: 'Default', url: dec });
      }
    } else if (dec && /^[A-Za-z0-9_-]{11}$/.test(dec)) {
      youtubeId = dec;
    }
  }

  const rawVidId = raw?.video_id
    ? String(raw.video_id).includes(':')
      ? decryptDishaField(raw.video_id)
      : String(raw.video_id).trim()
    : '';
  if (!youtubeId && rawVidId && /^[A-Za-z0-9_-]{11}$/.test(rawVidId)) {
    youtubeId = rawVidId;
  }

  if (streamUrl && (streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be'))) {
    const m = streamUrl.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    if (m?.[1]) youtubeId = m[1];
  }

  if (youtubeId) {
    embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`;
    if (!streamUrl) {
      streamUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    }
  }

  // 3. Check Appx video_player_token (ignore dummy '1234' token from folder_contentsv2!)
  const rawPlayerUrl = String(raw?.video_player_url || '').trim();
  const rawPlayerToken = String(raw?.video_player_token || '').trim();
  if (rawPlayerToken && rawPlayerToken !== '1234') {
    const fullAppxUrl = /token=$/.test(rawPlayerUrl)
      ? `${rawPlayerUrl}${encodeURIComponent(rawPlayerToken)}`
      : `https://appx-play.classx.co.in/combined-img-player?isMobile=true&token=${encodeURIComponent(rawPlayerToken)}`;
    playerUrl = `/api/disha-player?url=${encodeURIComponent(fullAppxUrl)}`;
    if (!embedUrl) {
      embedUrl = playerUrl;
    }
  }

  return { streamUrl, embedUrl, playerUrl, qualities, videoId: youtubeId };
}

function extractPdfFromRaw(raw: any) {
  let pdfUrl = '';
  const isVideoItem = String(raw?.material_type || '').toUpperCase() === 'VIDEO';
  const candidates: Array<[any, any, any, string]> = [
    [raw?.pdf_link, raw?.is_pdf_encrypted, raw?.pdf_encryption_key, 'pdf_link'],
    [raw?.pdf_link2, raw?.is_pdf2_encrypted, raw?.pdf2_encryption_key, 'pdf_link2'],
    [raw?.file_link, raw?.is_pdf_encrypted, raw?.pdf_encryption_key, 'file_link'],
  ];

  let pdfKey = '';
  let isEnc = false;

  for (const [rawLink, rawEncFlag, rawEncKey, fieldName] of candidates) {
    if (!rawLink) continue;
    if (isVideoItem && fieldName === 'file_link') continue;
    const dec =
      String(rawLink).includes(':') && !String(rawLink).startsWith('http')
        ? decryptDishaField(rawLink)
        : String(rawLink).trim();
    if (dec && /^https?:\/\//i.test(dec) && isRealMediaUrl(dec)) {
      pdfUrl = dec;
      isEnc = String(rawEncFlag ?? '0') !== '0';
      if (isEnc && rawEncKey) {
        const decKey = String(rawEncKey).includes(':') ? decryptDishaField(rawEncKey) : String(rawEncKey);
        pdfKey = (decKey || String(rawEncKey)).replace(/\0+$/g, '');
      }
      break;
    }
  }

  return { pdfUrl, pdfKey, isEncrypted: isEnc };
}

export const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

{

  // 1. Public GB Auth endpoint
  app.get('/api/public/gb-auth', async (_req, res) => {
    try {
      const token = await getUpstreamGbToken();
      res.json({
        status: true,
        success: true,
        token,
        expires_at: cachedGbToken?.expiresAt || Date.now() + 600000,
      });
    } catch {
      const now = Date.now();
      res.json({
        status: true,
        success: true,
        token: `${now}.gbstudy`,
        expires_at: now + 30 * 60 * 1000,
      });
    }
  });

  // 2. Disha Owner Session Store / Retrieve
  app.get('/api/public/disha-owner', async (req, res) => {
    const batchId = String(req.query.batch_id || req.query.batchId || '87');
    const owner = await getBatchOwnerCreds(batchId);
    if (owner) {
      res.json({ ok: true, success: true, userId: owner.userId, token: owner.token, data: owner });
      return;
    }
    res.json({ ok: false, success: false, data: null });
  });

  app.post('/api/public/disha-record', async (req, res) => {
    const { userId, token, mobile, name } = req.body || {};
    if (userId && token) {
      savedOwnerSession = {
        userId: String(userId),
        token: String(token),
        mobile: mobile ? String(mobile) : '',
        name: name ? String(name) : '',
        updated_at: new Date().toISOString(),
      };
      try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(savedOwnerSession, null, 2));
      } catch {
        // ignore
      }
    }
    res.json({ ok: true, success: true, data: savedOwnerSession });
  });

  // 3. Disha Batches (merges unlocked batches from batdisha.lovable.app first, then all courses)
  app.get('/api/disha/batches', async (req, res) => {
    try {
      const token = (req.headers['x-disha-token'] as string) || undefined;
      const userId = (req.headers['x-disha-userid'] as string) || undefined;

      const [mineList, allJson] = await Promise.all([
        (async () => {
          try {
            const gbToken = await getUpstreamGbToken();
            const owner87 = await getBatchOwnerCreds('87');
            const headers: Record<string, string> = {
              ...WORKER_HEADERS,
              'X-GB-Token': gbToken,
            };
            if (owner87) {
              headers['X-Disha-Auth'] = `${owner87.userId}:${owner87.token}`;
            }
            const r = await fetch(`${UPSTREAM_BACKEND}/api/disha/batches?mine=1&v=4`, { headers });
            if (!r.ok) return [];
            const j: any = await r.json();
            const arr = Array.isArray(j?.batches) ? j.batches : Array.isArray(j?.data?.batches) ? j.data.batches : [];
            return arr.map((b: any) => ({
              id: String(b.id),
              name: b.name || b.batch_name || '',
              thumbnail: b.previewImage || b.thumbnail || '/gb-study-logo.png',
              description: '',
              price: b.price ?? '',
              mrp: b.price ?? '',
              validity: '12 Months',
              startDate: b.start_date || '',
              endDate: b.expiry_date || '',
              folderWiseCourse: true,
            }));
          } catch {
            return [];
          }
        })(),
        dishaGet('/get/courselistnewv2?exam_name=&start=-1&userid=0', token, userId).catch(() => ({ data: [] })),
      ]);

      const rawList = Array.isArray(allJson?.data) ? allJson.data : [];
      const catalogList = rawList.map((b: any) => ({
        id: String(b.id),
        name: b.course_name || b.name || '',
        thumbnail: b.course_thumbnail || b.thumbnail || '/gb-study-logo.png',
        description: b.course_description || '',
        price: b.price ?? '',
        mrp: b.mrp ?? '',
        validity: b.validity || '12 Months',
        startDate: b.start_date || '',
        endDate: b.end_date || '',
        folderWiseCourse: Number(b.folder_wise_course ?? 1) === 1,
      }));

      const seen = new Set<string>();
      const merged: any[] = [];
      for (const item of [...mineList, ...catalogList]) {
        if (!item.id || seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }

      res.json({ success: true, count: merged.length, data: merged });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to load batches' });
    }
  });

  // 4. Disha Subjects
  app.get('/api/disha/subjects', async (req, res) => {
    try {
      const batchId = String(req.query.batchId || req.query.batch_id || '');
      if (!batchId) {
        res.status(400).json({ success: false, error: 'batchId required' });
        return;
      }
      const owner = await getBatchOwnerCreds(batchId);
      const token = (req.headers['x-disha-token'] as string) || owner?.token;
      const userId = (req.headers['x-disha-userid'] as string) || owner?.userId;

      const rootJson = await dishaGet(`/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=-1`, token, userId);
      const items = Array.isArray(rootJson?.data) ? rootJson.data : [];
      let folders = items.filter((x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER');

      if (folders.length === 1 && items.length === 1) {
        const innerJson = await dishaGet(
          `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(String(folders[0].id))}`,
          token,
          userId
        );
        const innerItems = Array.isArray(innerJson?.data) ? innerJson.data : [];
        const innerFolders = innerItems.filter((x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER');
        if (innerFolders.length > 0) {
          folders = innerFolders;
        }
      }

      const data = folders.map((f: any) => ({
        id: String(f.id),
        name: f.Title || f.title || f.subject_name || f.name || '',
        image: f.thumbnail || f.subject_logo || '',
        parentId: String(f.parent_id ?? '-1'),
      }));

      res.json({ success: true, batchId, count: data.length, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to load subjects' });
    }
  });

  // 5. Disha Chapters
  app.get('/api/disha/chapters', async (req, res) => {
    try {
      const batchId = String(req.query.batchId || req.query.batch_id || '');
      const subjectId = String(req.query.subjectId || req.query.subject_id || '');
      if (!batchId || !subjectId) {
        res.status(400).json({ success: false, error: 'batchId and subjectId required' });
        return;
      }
      const owner = await getBatchOwnerCreds(batchId);
      const token = (req.headers['x-disha-token'] as string) || owner?.token;
      const userId = (req.headers['x-disha-userid'] as string) || owner?.userId;

      const json = await dishaGet(
        `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(subjectId)}`,
        token,
        userId
      );
      const items = Array.isArray(json?.data) ? json.data : [];
      const folders = items.filter((x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER');
      const directMedia = items.filter((x: any) => String(x.material_type || '').toUpperCase() !== 'FOLDER');

      const data = folders.map((f: any) => ({
        id: String(f.id),
        name: f.Title || f.title || f.topic_name || f.name || '',
        image: f.thumbnail || '',
        parentId: String(f.parent_id ?? subjectId),
        videosCount: Number(f.videos_count ?? 0),
        pdfsCount: Number(f.pdfs_count ?? f.notes_count ?? 0),
      }));

      if (directMedia.length > 0) {
        data.unshift({
          id: subjectId,
          name: 'Lectures & Notes',
          image: '',
          parentId: subjectId,
          videosCount: directMedia.filter((x: any) => String(x.material_type || '').toUpperCase() === 'VIDEO').length,
          pdfsCount: directMedia.filter((x: any) => String(x.material_type || '').toUpperCase() === 'PDF').length,
        });
      }

      res.json({ success: true, batchId, subjectId, count: data.length, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to load chapters' });
    }
  });

  // 6. Disha Lectures & PDFs
  app.get('/api/disha/lectures', async (req, res) => {
    try {
      const batchId = String(req.query.batchId || req.query.batch_id || '');
      const subjectId = String(req.query.subjectId || req.query.subject_id || '');
      const chapterId = String(req.query.chapterId || req.query.chapter_id || subjectId);
      if (!batchId || !chapterId) {
        res.status(400).json({ success: false, error: 'batchId and chapterId required' });
        return;
      }
      const owner = await getBatchOwnerCreds(batchId);
      const token = (req.headers['x-disha-token'] as string) || owner?.token;
      const userId = (req.headers['x-disha-userid'] as string) || owner?.userId;

      const fetchFolderItems = async (parentId: string): Promise<any[]> => {
        try {
          const j = await dishaGet(
            `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(parentId)}`,
            token,
            userId
          );
          return Array.isArray(j?.data) ? j.data : [];
        } catch {
          return [];
        }
      };

      const topItems = await fetchFolderItems(chapterId);
      const subFolders: any[] = [];
      const allMediaItems: any[] = [];

      for (const item of topItems) {
        const type = String(item.material_type || '').toUpperCase();
        if (type === 'FOLDER') {
          subFolders.push({
            id: String(item.id || ''),
            title: item.Title || item.title || item.name || 'Folder',
            thumbnail: item.thumbnail || '',
          });
        } else {
          allMediaItems.push(item);
        }
      }

      if (subFolders.length > 0 && chapterId !== subjectId) {
        const level1Lists = await Promise.all(subFolders.slice(0, 25).map((sf) => fetchFolderItems(sf.id)));
        const level2Folders: string[] = [];
        for (const list of level1Lists) {
          for (const it of list) {
            if (String(it.material_type || '').toUpperCase() === 'FOLDER') {
              level2Folders.push(String(it.id));
            } else {
              allMediaItems.push(it);
            }
          }
        }
        if (level2Folders.length > 0) {
          const level2Lists = await Promise.all(level2Folders.slice(0, 25).map((fid) => fetchFolderItems(fid)));
          for (const list of level2Lists) {
            for (const it of list) {
              if (String(it.material_type || '').toUpperCase() !== 'FOLDER') {
                allMediaItems.push(it);
              }
            }
          }
        }
      }

      const lectures: any[] = [];
      const pdfs: any[] = [];
      const seenVideos = new Set<string>();
      const seenPdfs = new Set<string>();

      for (const item of allMediaItems) {
        const type = String(item.material_type || '').toUpperCase();
        const id = String(item.id || '');
        if (!id) continue;
        const title = item.Title || item.title || item.name || 'Untitled';
        const thumb = item.thumbnail && !String(item.thumbnail).includes(':') ? item.thumbnail : '';
        const date = item.date_and_time && !String(item.date_and_time).includes(':') ? item.date_and_time : '';
        const duration = String(item.duration || '');

        const { pdfUrl, pdfKey, isEncrypted } = extractPdfFromRaw(item);
        const hasAttachedPdf = Boolean(pdfUrl || item.pdf_link || item.pdf_link2);

        if (type === 'PDF' || (!item.video_id && !item.file_link && !item.video_player_token && pdfUrl)) {
          if (!seenPdfs.has(id)) {
            seenPdfs.add(id);
            pdfs.push({
              id,
              title,
              thumbnail: thumb,
              published: date,
              hasPdf: true,
              pdfUrl,
              pdfKey,
              isPdfEncrypted: isEncrypted,
            });
          }
          continue;
        }

        if (!seenVideos.has(id)) {
          seenVideos.add(id);
          const { streamUrl, embedUrl, playerUrl, qualities, videoId } = extractVideoUrlsFromRaw(item);
          lectures.push({
            id,
            title,
            thumbnail: thumb,
            duration,
            published: date,
            free: String(item.free_flag ?? '0') === '1',
            liveStatus: Number(item.live_status ?? 0),
            hasPdf: hasAttachedPdf,
            streamUrl,
            embedUrl,
            playerUrl,
            qualities,
            videoId,
            pdfUrl,
            pdfKey,
            isPdfEncrypted: isEncrypted,
          });
        }

        if (hasAttachedPdf && !seenPdfs.has(`att_${id}`)) {
          seenPdfs.add(`att_${id}`);
          pdfs.push({
            id,
            title: `${title} (PDF)`,
            thumbnail: thumb,
            published: date,
            hasPdf: true,
            pdfUrl,
            pdfKey,
            isPdfEncrypted: isEncrypted,
          });
        }
      }

      res.json({
        success: true,
        batchId,
        subjectId,
        chapterId,
        lecturesCount: lectures.length,
        pdfsCount: pdfs.length,
        subFoldersCount: subFolders.length,
        lectures,
        pdfs,
        subFolders,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to load lectures' });
    }
  });

  // 7. Disha Video Details (Resolves real streamUrl, YouTube embedUrl, or Appx /api/disha-player URL using Owner Token)
  app.get('/api/disha/video', async (req, res) => {
    try {
      const batchId = String(req.query.batchId || req.query.batch_id || '');
      const lectureId = String(req.query.lectureId || req.query.video_id || '');
      const chapterId = String(req.query.chapterId || req.query.chapter_id || req.query.subjectId || '');
      const headerToken = (req.headers['x-disha-token'] as string) || undefined;
      const headerUserId = (req.headers['x-disha-userid'] as string) || undefined;

      const owner = await getBatchOwnerCreds(batchId);
      const token = headerToken || owner?.token;
      const userId = headerUserId || owner?.userId;

      let raw: any = null;
      let extracted = { streamUrl: '', embedUrl: '', playerUrl: '', qualities: [] as Array<{ quality: string; url: string }>, videoId: '' };
      let pdfExtracted = { pdfUrl: '', pdfKey: '', isEncrypted: false };

      if (token && userId) {
        try {
          const detailJson = await dishaGet(
            `/get/fetchVideoDetailsById?course_id=${encodeURIComponent(batchId)}&video_id=${encodeURIComponent(lectureId)}&ytflag=0&folder_wise_course=1`,
            token,
            userId
          );
          if (detailJson?.data && typeof detailJson.data === 'object') {
            raw = detailJson.data;
            extracted = extractVideoUrlsFromRaw(raw);
            pdfExtracted = extractPdfFromRaw(raw);
          }
        } catch {
          // fallback below
        }
      }

      // Also check folder_contentsv2 if streamUrl and embedUrl are still empty (e.g., for public YouTube video_id in folder_contentsv2)
      if (!extracted.streamUrl && !extracted.embedUrl && chapterId) {
        try {
          const folderJson = await dishaGet(
            `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(chapterId)}`,
            token,
            userId
          );
          const items = Array.isArray(folderJson?.data) ? folderJson.data : [];
          let item = items.find((x: any) => String(x.id) === lectureId);
          if (!item) {
            const subFolders = items.filter((x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER');
            for (const sf of subFolders.slice(0, 15)) {
              const innerJson = await dishaGet(
                `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(String(sf.id))}`,
                token,
                userId
              );
              const found = (innerJson?.data || []).find((x: any) => String(x.id) === lectureId);
              if (found) {
                item = found;
                break;
              }
            }
          }
          if (item) {
            raw = raw || item;
            const folderExt = extractVideoUrlsFromRaw(item);
            if (folderExt.streamUrl || folderExt.embedUrl) {
              extracted = folderExt;
            }
            if (!pdfExtracted.pdfUrl) {
              pdfExtracted = extractPdfFromRaw(item);
            }
          }
        } catch {
          // ignore
        }
      }

      res.json({
        success: true,
        data: {
          id: String(raw?.id || lectureId),
          title: raw?.Title || raw?.title || '',
          description: raw?.description || '',
          thumbnail: raw?.thumbnail && !String(raw.thumbnail).includes(':') ? raw.thumbnail : '',
          duration: raw?.duration || '',
          published: raw?.date_and_time && !String(raw.date_and_time).includes(':') ? raw.date_and_time : '',
          streamUrl: extracted.streamUrl,
          embedUrl: extracted.embedUrl,
          playerUrl: extracted.playerUrl,
          qualities: extracted.qualities,
          videoId: extracted.videoId,
          pdfUrl: pdfExtracted.pdfUrl,
          pdfKey: pdfExtracted.pdfKey,
          isPdfEncrypted: pdfExtracted.isEncrypted,
          hasPdf: Boolean(pdfExtracted.pdfUrl || raw?.pdf_link || raw?.pdf_link2),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to resolve video' });
    }
  });

  // 8. Disha PDF Resolver (Uses Owner Token to resolve encrypted & signed static-db-v2.appx.co.in PDFs)
  const resolveDishaPdfInfo = async (
    batchId: string,
    lectureId: string,
    chapterId: string,
    headerToken?: string,
    headerUserId?: string,
    knownUrl?: string,
    knownKey?: string
  ) => {
    if (knownUrl && isRealMediaUrl(knownUrl)) {
      return {
        raw: null as any,
        pdfInfo: {
          pdfUrl: knownUrl,
          pdfKey: knownKey || '',
          isEncrypted: Boolean(knownKey),
        },
      };
    }

    const owner = await getBatchOwnerCreds(batchId);
    const token = headerToken || owner?.token;
    const userId = headerUserId || owner?.userId;

    let raw: any = null;
    let pdfInfo = { pdfUrl: '', pdfKey: '', isEncrypted: false };

    if (token && userId && lectureId) {
      try {
        const detailJson = await dishaGet(
          `/get/fetchVideoDetailsById?course_id=${encodeURIComponent(batchId)}&video_id=${encodeURIComponent(lectureId)}&ytflag=0&folder_wise_course=1`,
          token,
          userId
        );
        if (detailJson?.data && typeof detailJson.data === 'object') {
          raw = detailJson.data;
          pdfInfo = extractPdfFromRaw(raw);
        }
      } catch {
        // fallback below
      }
    }

    if (!pdfInfo.pdfUrl && chapterId) {
      try {
        const folderJson = await dishaGet(
          `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(chapterId)}`,
          token,
          userId
        );
        const items: any[] = Array.isArray(folderJson?.data) ? folderJson.data : [];
        const item = items.find((x: any) => String(x.id) === lectureId);
        if (item) {
          raw = raw || item;
          pdfInfo = extractPdfFromRaw(item);
        }
        // Check 1 level of subfolders if still not found
        if (!pdfInfo.pdfUrl) {
          const folders = items.filter(
            (x: any) => String(x.material_type || '').toUpperCase() === 'FOLDER' || Number(x.folder_wise_course) === 1
          );
          for (const sf of folders) {
            try {
              const sfJson = await dishaGet(
                `/get/folder_contentsv2?course_id=${encodeURIComponent(batchId)}&parent_id=${encodeURIComponent(String(sf.id))}`,
                token,
                userId
              );
              const sfItems: any[] = Array.isArray(sfJson?.data) ? sfJson.data : [];
              const found = sfItems.find((x: any) => String(x.id) === lectureId);
              if (found) {
                raw = raw || found;
                pdfInfo = extractPdfFromRaw(found);
                if (pdfInfo.pdfUrl) break;
              }
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return { raw, pdfInfo };
  };

  app.get('/api/disha/pdf', async (req, res) => {
    try {
      const batchId = String(req.query.batchId || req.query.batch_id || '');
      const lectureId = String(req.query.lectureId || req.query.video_id || '');
      const chapterId = String(req.query.chapterId || req.query.chapter_id || req.query.subjectId || '');
      const headerToken = (req.headers['x-disha-token'] as string) || (req.query.token as string) || undefined;
      const headerUserId = (req.headers['x-disha-userid'] as string) || (req.query.userId as string) || undefined;

      const { raw, pdfInfo } = await resolveDishaPdfInfo(batchId, lectureId, chapterId, headerToken, headerUserId);

      if (!pdfInfo.pdfUrl) {
        res.status(404).json({
          success: false,
          error: 'PDF not available for this lecture or requires batch login.',
        });
        return;
      }

      const proxyUrl = `/api/disha/pdf-file?u=${encodeURIComponent(pdfInfo.pdfUrl)}${
        pdfInfo.pdfKey ? `&k=${encodeURIComponent(pdfInfo.pdfKey)}` : ''
      }`;

      res.json({
        success: true,
        data: {
          id: String(raw?.id || lectureId),
          title: raw?.Title || raw?.title || 'Notes PDF',
          pdfUrl: proxyUrl,
          rawPdfUrl: pdfInfo.pdfUrl,
          pdfKey: pdfInfo.pdfKey,
          encrypted: pdfInfo.isEncrypted,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to resolve PDF' });
    }
  });

  // 8b. Direct New-Tab PDF Opener (/api/disha/open-pdf) - Resolves PDF and redirects straight to decrypted PDF stream
  app.get('/api/disha/open-pdf', async (req, res) => {
    try {
      const batchId = String(req.query.batchId || req.query.batch_id || '');
      const lectureId = String(req.query.lectureId || req.query.video_id || '');
      const chapterId = String(req.query.chapterId || req.query.chapter_id || req.query.subjectId || '');
      const knownUrl = String(req.query.u || req.query.url || '');
      const knownKey = String(req.query.k || req.query.key || '');
      const headerToken = (req.headers['x-disha-token'] as string) || (req.query.token as string) || undefined;
      const headerUserId = (req.headers['x-disha-userid'] as string) || (req.query.userId as string) || undefined;

      const { pdfInfo } = await resolveDishaPdfInfo(
        batchId,
        lectureId,
        chapterId,
        headerToken,
        headerUserId,
        knownUrl,
        knownKey
      );

      if (!pdfInfo.pdfUrl) {
        res.status(404).send('PDF not available for this lecture.');
        return;
      }

      const proxyUrl = `/api/disha/pdf-file?u=${encodeURIComponent(pdfInfo.pdfUrl)}${
        pdfInfo.pdfKey ? `&k=${encodeURIComponent(pdfInfo.pdfKey)}` : ''
      }`;
      res.redirect(302, proxyUrl);
    } catch (err: any) {
      res.status(500).send(err?.message || 'Failed to open PDF');
    }
  });

  // 9. PDF File & Media Proxy with automatic XOR-28 decryption and Worker/Upstream fallback
  const handleMediaProxy = async (req: express.Request, res: express.Response) => {
    try {
      const targetUrl = String(req.query.u || req.query.url || '');
      const xorKey = String(req.query.k || req.query.key || '');
      if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        res.status(400).send('Invalid target URL');
        return;
      }

      const b64 = Buffer.from(targetUrl, 'utf8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      let upstreamRes = await fetch(`${UPSTREAM_WORKER}/api/mp/${b64}/file.pdf`, {
        headers: WORKER_HEADERS,
      });

      if (!upstreamRes.ok) {
        try {
          const gbToken = await getUpstreamGbToken();
          upstreamRes = await fetch(
            `${UPSTREAM_BACKEND}/api/disha/pdf-file?u=${encodeURIComponent(targetUrl)}${
              xorKey ? `&k=${encodeURIComponent(xorKey)}` : ''
            }`,
            {
              headers: {
                ...WORKER_HEADERS,
                'X-GB-Token': gbToken,
              },
            }
          );
        } catch {
          // fallback to direct fetch below
        }
      }

      if (!upstreamRes.ok) {
        upstreamRes = await fetch(targetUrl, {
          headers: {
            'User-Agent': WORKER_HEADERS['User-Agent'],
            'Accept': '*/*',
          },
        });
      }

      if (!upstreamRes.ok) {
        res.status(upstreamRes.status).send(`Upstream error ${upstreamRes.status}`);
        return;
      }

      const contentType = upstreamRes.headers.get('content-type') || '';
      const isPdfRequest =
        req.path.includes('pdf-file') ||
        targetUrl.toLowerCase().includes('.pdf') ||
        Boolean(xorKey) ||
        contentType.includes('pdf');

      const arrayBuffer = await upstreamRes.arrayBuffer();
      let buffer: Buffer = Buffer.from(arrayBuffer);

      if (isPdfRequest && xorKey) {
        buffer = decryptXor28Pdf(buffer, xorKey);
      }

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      if (
        isPdfRequest ||
        (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46)
      ) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="gb-study-notes.pdf"');
      } else if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      res.send(buffer);
    } catch (err: any) {
      res.status(500).send(err?.message || 'Proxy error');
    }
  };

  app.get('/api/disha/pdf-file', handleMediaProxy);
  app.get('/api/media-proxy', handleMediaProxy);

  // 10. Appx Disha Player Page Proxy (rewrites O to location.origin so history.replaceState and /api/mp/* work seamlessly)
  app.get(['/api/disha-player', '/api/player-page-proxy'], async (req, res) => {
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const upstream = await fetch(`${UPSTREAM_WORKER}${req.path}${qs ? `?${qs}` : ''}`, {
        headers: WORKER_HEADERS,
      });
      let body = await upstream.text();
      body = body
        .replace(/var O="https:\/\/bat\.doc1\.workers\.dev"/g, 'var O=location.origin')
        .replace(/var O="https:\/\/batdisha\.lovable\.app"/g, 'var O=location.origin')
        .replace(
          '</head>',
          '<style>#lovable-badge,#watermark,[aria-label*="COMBINED_IMG_PLAYER"]{display:none!important}</style></head>'
        );
      res.status(upstream.status);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(body);
    } catch (err: any) {
      res.status(500).send(err?.message || 'Player proxy error');
    }
  });

  // 11. Appx Media Segment / Manifest / Key Proxy (/api/mp/:b64/:name) used inside /api/disha-player
  app.all('/api/mp/*', async (req, res) => {
    try {
      const upstreamUrl = `${UPSTREAM_WORKER}${req.originalUrl}`;
      const fetchHeaders: Record<string, string> = {
        ...WORKER_HEADERS,
        'Accept': req.headers['accept'] || '*/*',
      };
      if (req.headers['content-type']) {
        fetchHeaders['Content-Type'] = String(req.headers['content-type']);
      }
      if (req.headers['range']) {
        fetchHeaders['Range'] = String(req.headers['range']);
      }

      const upstreamRes = await fetch(upstreamUrl, {
        method: req.method,
        headers: fetchHeaders,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      });

      res.status(upstreamRes.status);
      res.setHeader('Access-Control-Allow-Origin', '*');
      const ct = upstreamRes.headers.get('content-type');
      if (ct) res.setHeader('Content-Type', ct);
      const cr = upstreamRes.headers.get('content-range');
      if (cr) res.setHeader('Content-Range', cr);

      const ab = await upstreamRes.arrayBuffer();
      res.send(Buffer.from(ab));
    } catch (err: any) {
      res.status(500).send(err?.message || 'MP proxy error');
    }
  });

}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GB STUDY server listening on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
