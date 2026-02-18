require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const readline = require('node:readline');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const GOOGLE_OAUTH_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || '';
const MAX_IMAGES_PER_SCAN = Number(process.env.MAX_IMAGES_PER_SCAN || 80);
const MIN_SIMILARITY = Number(process.env.FACE_SIMILARITY_THRESHOLD || 80);
const MAX_REFERENCE_IMAGE_BYTES = 5 * 1024 * 1024;
const FACE_MATCHER_SCRIPT = process.env.FACE_MATCHER_SCRIPT || '/home/ubuntu/face_match_local.py';
const FACE_MATCHER_PYTHON = process.env.FACE_MATCHER_PYTHON || '/home/ubuntu/.venvs/face/bin/python';
const FACE_MATCHER_TIMEOUT_MS = Number(process.env.FACE_MATCHER_TIMEOUT_MS || 900000);
const FACE_METADATA_CACHE_DIR = process.env.FACE_METADATA_CACHE_DIR || '/home/ubuntu/.cache/drive-face-index';
const FACE_VECTOR_BACKEND = (process.env.FACE_VECTOR_BACKEND || 'file').toLowerCase();
const FACE_PGVECTOR_DSN = process.env.FACE_PGVECTOR_DSN || '';
const FACE_PGVECTOR_SCHEMA = process.env.FACE_PGVECTOR_SCHEMA || 'public';
const FACE_PGVECTOR_TABLE_PREFIX = process.env.FACE_PGVECTOR_TABLE_PREFIX || 'drive_face';
const DRIVE_PREVIEW_TIMEOUT_MS = Number(process.env.DRIVE_PREVIEW_TIMEOUT_MS || 12000);
const DRIVE_PREVIEW_MAX_WIDTH = Number(process.env.DRIVE_PREVIEW_MAX_WIDTH || 1200);
const SCAN_JOB_TTL_MS = Number(process.env.SCAN_JOB_TTL_MS || 1000 * 60 * 60 * 6);
const AUTH_BYPASS = String(process.env.AUTH_BYPASS || '').toLowerCase() === 'true';
const AUTH_BYPASS_USER_ID = process.env.AUTH_BYPASS_USER_ID || 'public-user';
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'drive_face_auth';
const AUTH_COOKIE_MAX_AGE_MS = Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30);
const AUTH_COOKIE_SECRET =
  process.env.AUTH_COOKIE_SECRET ||
  process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
  'change-me-auth-cookie-secret';
const OAUTH_STATE_COOKIE_NAME = process.env.OAUTH_STATE_COOKIE_NAME || 'drive_face_oauth_state';
const OAUTH_STATE_MAX_AGE_MS = Number(process.env.OAUTH_STATE_MAX_AGE_MS || 1000 * 60 * 10);
const GUEST_COOKIE_NAME = process.env.GUEST_COOKIE_NAME || 'drive_face_guest';
const GUEST_COOKIE_MAX_AGE_MS = Number(process.env.GUEST_COOKIE_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30);
const GUEST_USER_PREFIX = 'guest_';
const scanJobs = new Map();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_REFERENCE_IMAGE_BYTES,
  },
});

app.use(express.urlencoded({ extended: true }));
setInterval(pruneExpiredScanJobs, 15 * 60 * 1000).unref();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err.message));

const faceScanSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, index: true },
  folderLink: { type: String, required: true },
  folderId: { type: String, required: true },
  totalFilesListed: { type: Number, default: 0 },
  totalFilesScanned: { type: Number, required: true },
  downloadErrorCount: { type: Number, default: 0 },
  matchedCount: { type: Number, required: true },
  minSimilarityUsed: { type: Number, required: true },
  adaptiveThresholdUsed: { type: Boolean, default: false },
  warnings: [{ type: String }],
  matches: [
    {
      fileId: { type: String, required: true },
      fileName: { type: String, required: true },
      similarity: { type: Number, required: true },
      mimeType: { type: String, required: true },
      webViewLink: { type: String },
      previewUrl: { type: String, required: true },
      downloadUrl: { type: String, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now, index: true },
});

const FaceScan = mongoose.model('FaceScan', faceScanSchema);

const userPreferenceSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true, index: true },
  defaultFolderLink: { type: String, default: '' },
  defaultFolderId: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

function parseCookies(req) {
  const raw = String(req.headers.cookie || '');
  if (!raw) return {};
  return raw.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx <= 0) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      acc[key] = decodeURIComponent(value);
    } catch (_err) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

function isGuestUserId(value) {
  return typeof value === 'string' && new RegExp(`^${GUEST_USER_PREFIX}[a-f0-9]{16,64}$`).test(value);
}

function getGuestUserId(req) {
  const cookies = parseCookies(req);
  const value = cookies[GUEST_COOKIE_NAME];
  if (!isGuestUserId(value)) {
    return null;
  }
  return value;
}

function cookieSecure(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  return proto === 'https';
}

function signAuthPayload(payload) {
  return crypto.createHmac('sha256', AUTH_COOKIE_SECRET).update(payload).digest('base64url');
}

function encodeAuthSession(session) {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url');
  const signature = signAuthPayload(payload);
  return `${payload}.${signature}`;
}

function decodeAuthSession(value) {
  if (typeof value !== 'string' || value.indexOf('.') === -1) {
    return null;
  }
  const [payload, signature] = value.split('.', 2);
  if (!payload || !signature) {
    return null;
  }
  const expected = signAuthPayload(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || !parsed.sub) {
      return null;
    }
    return parsed;
  } catch (_err) {
    return null;
  }
}

function getGoogleAuthSession(req) {
  const cookies = parseCookies(req);
  return decodeAuthSession(cookies[AUTH_COOKIE_NAME]);
}

function getGoogleOAuthRedirectUri(req) {
  if (GOOGLE_OAUTH_REDIRECT_URI) {
    return GOOGLE_OAUTH_REDIRECT_URI;
  }
  return `${getAppBaseUrl(req)}/auth/google/callback`;
}

function getAuthContext(req) {
  const googleSession = getGoogleAuthSession(req);
  if (googleSession && googleSession.sub) {
    return {
      userId: `google_${googleSession.sub}`,
      mode: 'google',
      profile: googleSession,
    };
  }

  const guestUserId = getGuestUserId(req);
  if (guestUserId) {
    return { userId: guestUserId, mode: 'guest' };
  }

  if (AUTH_BYPASS) {
    return { userId: AUTH_BYPASS_USER_ID, mode: 'bypass' };
  }

  return { userId: null, mode: 'none' };
}

function getUserId(req) {
  return getAuthContext(req).userId;
}

function setAuthCookie(req, res, session) {
  res.cookie(AUTH_COOKIE_NAME, encodeAuthSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAuthCookie(req, res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    path: '/',
  });
}

function setOAuthStateCookie(req, res, state) {
  res.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: '/',
  });
}

function clearOAuthStateCookie(req, res) {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    path: '/',
  });
}

function getOAuthStateCookie(req) {
  const cookies = parseCookies(req);
  return cookies[OAUTH_STATE_COOKIE_NAME] || '';
}

async function exchangeGoogleAuthCode({ code, redirectUri }) {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    client_secret: GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload.error_description || payload.error || 'Google token exchange failed';
    throw new Error(detail);
  }
  return payload;
}

async function fetchGoogleProfile({ idToken, accessToken }) {
  if (idToken) {
    const tokenInfoUrl = new URL('https://oauth2.googleapis.com/tokeninfo');
    tokenInfoUrl.searchParams.set('id_token', idToken);
    const tokenInfoResponse = await fetch(tokenInfoUrl);
    const tokenInfoPayload = await tokenInfoResponse.json().catch(() => ({}));

    if (!tokenInfoResponse.ok) {
      throw new Error(tokenInfoPayload.error_description || tokenInfoPayload.error || 'Invalid Google id_token');
    }

    if (tokenInfoPayload.aud !== GOOGLE_OAUTH_CLIENT_ID) {
      throw new Error('Google token audience mismatch');
    }

    if (!tokenInfoPayload.sub) {
      throw new Error('Google profile missing subject');
    }

    return {
      sub: tokenInfoPayload.sub,
      email: tokenInfoPayload.email || '',
      email_verified: tokenInfoPayload.email_verified === 'true',
      name: tokenInfoPayload.name || '',
      picture: tokenInfoPayload.picture || '',
    };
  }

  if (accessToken) {
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profilePayload = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok) {
      throw new Error(profilePayload.error_description || profilePayload.error || 'Failed to fetch Google profile');
    }
    if (!profilePayload.sub) {
      throw new Error('Google profile missing subject');
    }
    return {
      sub: profilePayload.sub,
      email: profilePayload.email || '',
      email_verified: Boolean(profilePayload.email_verified),
      name: profilePayload.name || '',
      picture: profilePayload.picture || '',
    };
  }

  throw new Error('Google OAuth token response missing id_token/access_token');
}

function setGuestCookie(req, res, guestUserId) {
  res.cookie(GUEST_COOKIE_NAME, guestUserId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    maxAge: GUEST_COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearGuestCookie(req, res) {
  res.clearCookie(GUEST_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req),
    path: '/',
  });
}

function getAppBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${req.headers.host}`;
}

function inferPublicUrl(req) {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  }

  try {
    const url = new URL(getAppBaseUrl(req));
    if (url.port === '3000') {
      url.port = '';
    }
    return url.toString().replace(/\/$/, '');
  } catch (_err) {
    return getAppBaseUrl(req).replace(/:3000$/, '');
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractDriveFolderId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  try {
    const parsed = new URL(trimmed);
    const id = parsed.searchParams.get('id');
    if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) {
      return id;
    }
  } catch (err) {
    return null;
  }

  return null;
}

function looksLikeHtmlResponse(content, contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('text/html')) {
    return true;
  }
  const prefix = Buffer.from(content || []).subarray(0, 320).toString('utf8').toLowerCase();
  return prefix.includes('<html') || prefix.includes('<!doctype html') || prefix.includes('<head');
}

function looksLikeImageBytes(content) {
  const buffer = Buffer.from(content || []);
  if (buffer.length < 12) {
    return false;
  }
  return (
    buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) ||
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' ||
    buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
    buffer.subarray(0, 6).toString('ascii') === 'GIF89a' ||
    buffer.subarray(0, 2).toString('ascii') === 'BM'
  );
}

function buildPreviewCandidateUrls(fileId) {
  const safeId = encodeURIComponent(fileId);
  const width = Number.isFinite(DRIVE_PREVIEW_MAX_WIDTH) && DRIVE_PREVIEW_MAX_WIDTH >= 320
    ? Math.min(2400, Math.floor(DRIVE_PREVIEW_MAX_WIDTH))
    : 1200;

  const urls = [
    `https://drive.google.com/thumbnail?id=${safeId}&sz=w${width}`,
    `https://lh3.googleusercontent.com/d/${safeId}=w${width}`,
    `https://drive.google.com/uc?export=view&id=${safeId}`,
  ];

  if (process.env.GOOGLE_API_KEY) {
    urls.push(`https://www.googleapis.com/drive/v3/files/${safeId}?alt=media&key=${encodeURIComponent(process.env.GOOGLE_API_KEY)}`);
  }

  return urls;
}

async function fetchPreviewImage(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DRIVE_PREVIEW_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'DriveFaceDashboard/1.0',
      },
    });
    if (!response.ok) {
      return null;
    }

    const body = Buffer.from(await response.arrayBuffer());
    if (!body.length) {
      return null;
    }

    const rawType = String(response.headers.get('content-type') || '').toLowerCase();
    if (looksLikeHtmlResponse(body, rawType)) {
      return null;
    }

    const contentType = rawType.split(';')[0].trim();
    if (!contentType.startsWith('image/') && !looksLikeImageBytes(body)) {
      return null;
    }

    return {
      body,
      contentType: contentType.startsWith('image/') ? contentType : 'image/jpeg',
    };
  } catch (_err) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseFaceMatcherOutput(stdout) {
  const lines = String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch (_err) {
      // Continue until valid JSON is found.
    }
  }

  throw new Error('Face matcher returned invalid output');
}

function parseFaceMatcherProgressLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed.startsWith('PROGRESS ')) {
    return null;
  }
  try {
    const payload = JSON.parse(trimmed.slice('PROGRESS '.length));
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return payload;
  } catch (_err) {
    return null;
  }
}

function getFileExtension(fileName) {
  const ext = path.extname(fileName || '').toLowerCase();
  if (!ext) return '.jpg';
  if (ext.length > 8) return '.jpg';
  return ext;
}

async function runLocalFaceMatcher({ folderId, referenceImageBuffer, referenceImageName, onProgress }) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'face-ref-'));
  const referencePath = path.join(tmpDir, `reference${getFileExtension(referenceImageName)}`);

  try {
    await fs.writeFile(referencePath, referenceImageBuffer);

    const args = [
      FACE_MATCHER_SCRIPT,
      '--folder-id',
      folderId,
      '--google-api-key',
      process.env.GOOGLE_API_KEY,
      '--reference-image',
      referencePath,
      '--max-images',
      String(MAX_IMAGES_PER_SCAN),
      '--threshold',
      String(MIN_SIMILARITY),
      '--metadata-cache-dir',
      FACE_METADATA_CACHE_DIR,
      '--vector-backend',
      FACE_VECTOR_BACKEND,
    ];
    if (FACE_VECTOR_BACKEND === 'pgvector') {
      args.push('--pgvector-dsn', FACE_PGVECTOR_DSN);
      args.push('--pgvector-schema', FACE_PGVECTOR_SCHEMA);
      args.push('--pgvector-table-prefix', FACE_PGVECTOR_TABLE_PREFIX);
    }

    const result = await new Promise((resolve, reject) => {
      const child = spawn(FACE_MATCHER_PYTHON, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const killTimer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, FACE_MATCHER_TIMEOUT_MS);

      const outReader = readline.createInterface({ input: child.stdout });
      outReader.on('line', (line) => {
        stdout += `${line}\n`;
      });

      const errReader = readline.createInterface({ input: child.stderr });
      errReader.on('line', (line) => {
        const progressPayload = parseFaceMatcherProgressLine(line);
        if (progressPayload && typeof onProgress === 'function') {
          onProgress(progressPayload);
          return;
        }
        const trimmed = String(line || '').trim();
        if (trimmed) {
          stderr += `${trimmed}\n`;
          console.log('face_match_local.py stderr:', trimmed);
        }
      });

      child.on('error', (err) => {
        clearTimeout(killTimer);
        outReader.close();
        errReader.close();
        reject(err);
      });

      child.on('close', (code) => {
        clearTimeout(killTimer);
        outReader.close();
        errReader.close();
        if (code === 0 && !timedOut) {
          try {
            resolve(parseFaceMatcherOutput(stdout));
          } catch (parseErr) {
            reject(parseErr);
          }
          return;
        }
        if (timedOut) {
          reject(new Error(`Face matcher timed out after ${FACE_MATCHER_TIMEOUT_MS}ms`));
          return;
        }
        reject(new Error(stderr.trim() || stdout.trim() || 'Local face matcher failed'));
      });
    });

    return result;
  } catch (err) {
    const message = err.message || 'Local face matcher failed';

    throw new Error(message);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

function userFacingScanError(err) {
  const raw = String((err && err.message) || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) {
    return 'Scan failed. Check Drive access or local face engine logs.';
  }

  if (/No clear face found in reference image/i.test(raw)) {
    return 'No clear face found in your selfie. Upload a closer, front-facing photo with good lighting.';
  }

  if (/Reference face is too blurry/i.test(raw)) {
    return 'Your selfie is blurry. Upload a sharper, non-blurry front-facing photo.';
  }

  if (/Unable to decode reference image/i.test(raw)) {
    return 'Could not read the uploaded image. Please upload a valid JPG or PNG file.';
  }

  if (/Drive list API failed \(403\)|Method doesn.t allow unregistered callers|PERMISSION_DENIED/i.test(raw)) {
    return 'Google Drive API access denied. Check your API key restrictions and folder sharing permissions.';
  }

  if (/anti-bot|automated queries|unusual traffic/i.test(raw)) {
    return 'Google temporarily blocked downloads from this server. Retry in 1-2 minutes.';
  }

  if (/Drive list API failed \(404\)|File not found/i.test(raw)) {
    return 'Google Drive folder not found. Please verify the folder link.';
  }

  if (/Model download failed|Downloaded model file is incomplete/i.test(raw)) {
    return 'Server face model setup failed. Please retry in a minute.';
  }

  if (raw.length > 190) {
    return `${raw.slice(0, 187)}...`;
  }
  return raw;
}

function toJobPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Number(num.toFixed(2))));
}

function scanStageFromProgress(progress) {
  const phase = String(progress?.phase || '').toLowerCase();
  if (phase === 'listed') {
    return 'Drive files listed. Starting face scan...';
  }
  if (phase === 'processing') {
    return 'Scanning images and matching faces...';
  }
  if (phase === 'completed') {
    return 'Scan completed.';
  }
  return 'Scanning in progress...';
}

function pruneExpiredScanJobs() {
  const now = Date.now();
  for (const [jobId, job] of scanJobs.entries()) {
    const updatedAt = Number(job.updatedAt || job.createdAt || 0);
    if (!updatedAt) continue;
    if ((now - updatedAt) > SCAN_JOB_TTL_MS) {
      scanJobs.delete(jobId);
    }
  }
}

function createScanJob(input) {
  pruneExpiredScanJobs();
  const id = crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  const job = {
    id,
    userId: input.userId,
    status: 'queued',
    stage: 'Queued...',
    progressPercent: 0,
    totalFilesListed: 0,
    completedItems: 0,
    processedItems: 0,
    matchedCount: 0,
    errorMessage: '',
    scanId: '',
    warnings: [],
    createdAt: now,
    updatedAt: now,
    input,
  };
  scanJobs.set(id, job);
  return job;
}

function getOwnedScanJob(jobId, userId) {
  const job = scanJobs.get(jobId);
  if (!job) return null;
  if (job.userId !== userId) return null;
  return job;
}

function updateScanJobFromProgress(job, progress) {
  const listed = Number(progress.listed);
  const completed = Number(progress.completed);
  const processed = Number(progress.processed);
  const percent = Number(progress.percent);

  if (Number.isFinite(listed) && listed >= 0) {
    job.totalFilesListed = Math.floor(listed);
  }
  if (Number.isFinite(completed) && completed >= 0) {
    job.completedItems = Math.floor(completed);
  }
  if (Number.isFinite(processed) && processed >= 0) {
    job.processedItems = Math.floor(processed);
  }

  if (Number.isFinite(percent)) {
    job.progressPercent = toJobPercent(percent);
  } else if (job.totalFilesListed > 0) {
    job.progressPercent = toJobPercent((job.completedItems / job.totalFilesListed) * 100);
  }

  job.stage = scanStageFromProgress(progress);
  job.updatedAt = Date.now();
}

async function runScanJob(job) {
  const {
    userId,
    folderId,
    effectiveDriveLink,
    rawDriveLink,
    preferSavedDrive,
    referenceImageBuffer,
    referenceImageName,
  } = job.input;

  job.status = 'running';
  job.stage = 'Preparing scan...';
  job.progressPercent = 0;
  job.updatedAt = Date.now();

  try {
    const result = await runLocalFaceMatcher({
      folderId,
      referenceImageBuffer,
      referenceImageName,
      onProgress: (progress) => updateScanJobFromProgress(job, progress),
    });

    const totalFilesListed = Number(result.totalFilesListed || result.totalFilesScanned || 0);
    const totalFilesScanned = Number(result.totalFilesScanned || 0);
    const downloadErrorCount = Number(result.downloadErrorCount || 0);
    const effectiveThreshold = Number(result.effectiveThreshold || MIN_SIMILARITY);
    const adaptiveThresholdUsed = Boolean(result.adaptiveThresholdUsed);
    const warnings = Array.isArray(result.warnings) ? result.warnings.slice(0, 8).map((w) => String(w)) : [];

    if (!totalFilesListed) {
      throw new Error('No images found in this folder or folder is not accessible');
    }

    if (!totalFilesScanned && downloadErrorCount > 0) {
      throw new Error('Could not process Drive images. Google temporarily blocked downloads. Retry in 1-2 minutes');
    }

    const matches = Array.isArray(result.matches)
      ? result.matches.sort((a, b) => b.similarity - a.similarity)
      : [];

    const saved = await FaceScan.create({
      clerkUserId: userId,
      folderLink: effectiveDriveLink,
      folderId,
      totalFilesListed,
      totalFilesScanned,
      downloadErrorCount,
      matchedCount: matches.length,
      minSimilarityUsed: effectiveThreshold,
      adaptiveThresholdUsed,
      warnings,
      matches,
    });

    if (rawDriveLink && !preferSavedDrive) {
      await UserPreference.findOneAndUpdate(
        { clerkUserId: userId },
        {
          defaultFolderLink: rawDriveLink,
          defaultFolderId: folderId,
          updatedAt: new Date(),
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    job.status = 'completed';
    job.stage = 'Completed';
    job.totalFilesListed = totalFilesListed;
    job.processedItems = totalFilesScanned;
    job.completedItems = Math.max(job.completedItems, totalFilesScanned);
    if (job.totalFilesListed > 0) {
      job.progressPercent = toJobPercent((job.completedItems / job.totalFilesListed) * 100);
    } else {
      job.progressPercent = 100;
    }
    job.matchedCount = matches.length;
    job.warnings = warnings;
    job.scanId = String(saved._id);
    job.updatedAt = Date.now();
  } catch (err) {
    console.error('Scan failed:', err);
    job.status = 'failed';
    job.stage = 'Failed';
    job.errorMessage = userFacingScanError(err);
    job.updatedAt = Date.now();
  } finally {
    job.input.referenceImageBuffer = null;
    job.input = {
      userId: job.input.userId,
      folderId: job.input.folderId,
    };
  }
}

function pageShell(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-1: #f4efe6;
      --bg-2: #dbe9f4;
      --ink: #1c1a1a;
      --muted: #57585f;
      --card: rgba(255, 255, 255, 0.85);
      --line: rgba(28, 26, 26, 0.15);
      --accent: #1f8a70;
      --accent-2: #c75000;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: 'Space Grotesk', sans-serif;
      background:
        radial-gradient(1200px 500px at -10% -10%, #ffe6c6 5%, transparent 60%),
        radial-gradient(900px 450px at 110% 10%, #d9f2ef 8%, transparent 55%),
        linear-gradient(145deg, var(--bg-1), var(--bg-2));
      min-height: 100vh;
    }

    .wrap {
      width: min(1120px, 94vw);
      margin: 24px auto 48px;
    }

    .top {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .brand {
      font-family: 'Fraunces', serif;
      font-size: clamp(1.3rem, 3vw, 2rem);
      letter-spacing: 0.3px;
      margin: 0;
    }

    .nav {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }

    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 14px;
      background: #fff;
      color: var(--ink);
      text-decoration: none;
      font-size: 0.92rem;
    }

    .hero {
      border: 1px solid var(--line);
      background: var(--card);
      backdrop-filter: blur(4px);
      border-radius: 24px;
      padding: 26px;
      box-shadow: 0 16px 36px rgba(31, 46, 66, 0.12);
      margin-bottom: 20px;
      animation: rise 0.45s ease-out;
    }

    .hero h2 {
      margin: 0 0 8px;
      font-family: 'Fraunces', serif;
      font-size: clamp(1.5rem, 4vw, 2.3rem);
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    @media (min-width: 900px) {
      .grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }
    }

    .card {
      border: 1px solid var(--line);
      background: var(--card);
      border-radius: 20px;
      padding: 18px;
      box-shadow: 0 12px 24px rgba(29, 29, 29, 0.07);
      animation: rise 0.45s ease-out;
    }

    .card h3 {
      margin: 2px 0 12px;
      font-family: 'Fraunces', serif;
      font-size: 1.35rem;
    }

    label {
      display: block;
      font-size: 0.94rem;
      margin: 14px 0 6px;
      color: #2b2d34;
    }

    input[type='text'],
    input[type='file'] {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.95);
      padding: 11px 12px;
      font: inherit;
      color: var(--ink);
    }

    .btn {
      margin-top: 14px;
      border: none;
      border-radius: 14px;
      padding: 12px 16px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.15s ease, opacity 0.2s ease;
      display: inline-block;
      text-decoration: none;
    }

    .btn:hover { transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }

    .btn-main {
      background: linear-gradient(135deg, var(--accent), #126e5a);
      color: #f7fbfa;
    }

    .btn-alt {
      background: linear-gradient(135deg, var(--accent-2), #974000);
      color: #fff;
    }

    .hint {
      margin-top: 10px;
      font-size: 0.9rem;
      color: var(--muted);
      line-height: 1.5;
    }

    .warning {
      margin: 12px 0 0;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(199, 80, 0, 0.4);
      background: rgba(255, 232, 212, 0.9);
      color: #7f3500;
      font-size: 0.93rem;
    }

    .progress-box {
      margin-top: 14px;
      border: 1px solid rgba(31, 138, 112, 0.3);
      background: rgba(222, 248, 241, 0.75);
      border-radius: 14px;
      padding: 12px;
      display: grid;
      gap: 8px;
    }

    .progress-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #0f5f4d;
      margin: 0;
    }

    .progress-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.88rem;
      color: #214f45;
    }

    .progress-track {
      width: 100%;
      height: 10px;
      border-radius: 999px;
      background: rgba(31, 138, 112, 0.16);
      overflow: hidden;
      border: 1px solid rgba(31, 138, 112, 0.18);
    }

    .progress-fill {
      height: 100%;
      width: 0;
      border-radius: 999px;
      background: linear-gradient(90deg, #159273, #34b38f);
      transition: width 0.6s ease;
    }

    .progress-note {
      margin: 0;
      font-size: 0.86rem;
      color: #2f6158;
      line-height: 1.45;
    }

    .scan-list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .scan-item {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.95);
      padding: 12px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .scan-meta {
      font-size: 0.88rem;
      color: var(--muted);
    }

    .gallery {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    }

    .photo {
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      min-height: 300px;
    }

    .photo img {
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
      background: #f6f6f6;
    }

    .photo-body {
      padding: 12px;
      display: grid;
      gap: 8px;
    }

    .photo-name {
      font-size: 0.95rem;
      word-break: break-word;
    }

    .score {
      font-size: 0.85rem;
      color: #0d5f4f;
      font-weight: 700;
    }

    .photo-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .photo-actions a {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 7px 12px;
      text-decoration: none;
      color: var(--ink);
      background: #fff;
      font-size: 0.86rem;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }

    .kpi {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.94);
      padding: 10px 12px;
    }

    .kpi-label {
      font-size: 0.78rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi-value {
      font-size: 1.08rem;
      margin-top: 3px;
      font-weight: 700;
    }

    .actions-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }

    .actions-row a,
    .actions-row button {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 13px;
      font-size: 0.9rem;
      text-decoration: none;
      color: var(--ink);
      background: #fff;
      cursor: pointer;
      font-family: inherit;
    }

    .meta-line {
      color: var(--muted);
      font-size: 0.91rem;
      line-height: 1.5;
    }

    .scan-id {
      font-family: monospace;
      font-size: 0.82rem;
      color: var(--muted);
      margin-top: 5px;
    }

    .history-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.94);
    }

    .history-table th,
    .history-table td {
      border-bottom: 1px solid var(--line);
      padding: 11px 10px;
      text-align: left;
      font-size: 0.9rem;
    }

    .history-table th {
      font-size: 0.78rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: rgba(255, 255, 255, 0.98);
    }

    .history-table tr:last-child td {
      border-bottom: none;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <main class="wrap">
    ${body}
  </main>
  <script>
    document.querySelectorAll('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = button.getAttribute('data-copy');
        if (!value) return;
        try {
          await navigator.clipboard.writeText(value);
          const original = button.textContent;
          button.textContent = 'Copied';
          setTimeout(() => { button.textContent = original; }, 1200);
        } catch (_err) {
          alert('Copy failed. Please copy manually: ' + value);
        }
      });
    });

    document.querySelectorAll('img[data-fallback]').forEach((img) => {
      img.addEventListener('error', () => {
        const fallback = img.getAttribute('data-fallback');
        const alreadyUsed = img.getAttribute('data-fallback-used') === '1';
        if (!alreadyUsed && fallback) {
          img.setAttribute('data-fallback-used', '1');
          img.src = fallback;
          return;
        }
        img.style.opacity = '0.35';
      });
    });

    const scanForm = document.querySelector('[data-scan-form]');
    if (scanForm) {
      const driveInput = scanForm.querySelector('input[name="driveLink"]');
      const estimateEl = document.querySelector('[data-scan-estimate]');
      const submitButtons = scanForm.querySelectorAll('button[type="submit"]');

      function extractDriveId(input) {
        const raw = String(input || '').trim();
        if (!raw) return '';
        if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;
        const folderMatch = raw.match(/\/folders\/([A-Za-z0-9_-]+)/);
        if (folderMatch && folderMatch[1]) return folderMatch[1];
        try {
          const parsed = new URL(raw);
          const id = parsed.searchParams.get('id');
          if (id && /^[A-Za-z0-9_-]{10,}$/.test(id)) return id;
        } catch (_err) {
          return '';
        }
        return '';
      }

      function isNewDriveAttempt() {
        if (!estimateEl) return true;
        const savedDriveId = String(estimateEl.getAttribute('data-saved-drive-id') || '').trim();
        const enteredId = extractDriveId(driveInput ? driveInput.value : '');
        if (!savedDriveId) return true;
        if (!enteredId) return false;
        return enteredId !== savedDriveId;
      }

      function updateEstimateText() {
        if (!estimateEl) return;
        if (isNewDriveAttempt()) {
          estimateEl.textContent = 'First scan for a new Drive link can take around 5 to 20 minutes depending on folder size. You can keep this page open, or come back later and check All Scans.';
          return;
        }
        estimateEl.textContent = 'Using saved Drive link is usually faster because cached metadata/embeddings are reused. Keep this page open until redirect to results.';
      }

      updateEstimateText();
      if (driveInput) {
        driveInput.addEventListener('input', updateEstimateText);
      }

      scanForm.addEventListener('submit', () => {
        updateEstimateText();
        window.setTimeout(() => {
          submitButtons.forEach((button) => {
            button.disabled = true;
            button.style.opacity = '0.65';
          });
        }, 0);
      });
    }
  </script>
</body>
</html>`;
}

function guestPage(req) {
  return pageShell(
    'Drive Face Dashboard',
    `<section class="hero">
      <h2>Find your photos from a shared Google Drive folder</h2>
      <p>Use guest mode without password, or sign in with your account. Upload selfie and start matching.</p>
    </section>

    <section class="card">
      <h3>Choose access mode</h3>
      <p class="hint">Guest mode starts instantly (no password). Account mode keeps your history tied to your real login.</p>
      <div class="nav" style="margin-top:14px;">
        <a class="btn btn-main" href="/guest-login">Continue as Guest</a>
        <a class="btn btn-main" href="/sign-in">Sign In With Google</a>
      </div>
    </section>`
  );
}

function dashboardPage({ userId, recentScans, errorMessage, publicUrl, savedDriveLink, savedDriveId, authMode }) {
  const isGuestMode = authMode === 'guest' || authMode === 'bypass';
  const hasSavedDrive = Boolean(savedDriveId);
  const latest = recentScans.length ? recentScans[0] : null;
  const totalScanned = recentScans.reduce((sum, item) => sum + (item.totalFilesScanned || 0), 0);
  const totalMatches = recentScans.reduce((sum, item) => sum + (item.matchedCount || 0), 0);

  const listHtml = recentScans.length
    ? recentScans
        .map(
          (scan) => `<li class="scan-item">
            <div>
              <strong>${scan.matchedCount} match${scan.matchedCount === 1 ? '' : 'es'}</strong>
              <div class="scan-meta">${new Date(scan.createdAt).toLocaleString()} | scanned ${scan.totalFilesScanned} image${scan.totalFilesScanned === 1 ? '' : 's'}</div>
              <div class="scan-id">Scan ID: ${scan._id}</div>
            </div>
            <a class="pill" href="/scan/${scan._id}">Open result</a>
          </li>`
        )
        .join('')
    : '<li class="scan-item"><span class="scan-meta">No scans yet. Run your first scan from the left panel.</span></li>';

  return pageShell(
    'Dashboard',
    `<header class="top">
      <h1 class="brand">Drive Face Dashboard</h1>
      <nav class="nav">
        <span class="pill">User: ${escapeHtml(userId)}${isGuestMode ? ' (Guest)' : ''}</span>
        <a class="pill" href="/scans">All Scans</a>
        ${isGuestMode ? '<a class="pill" href="/sign-in">Sign In</a>' : '<span class="pill">Google Account</span>'}
        <a class="pill" href="/logout">Logout</a>
      </nav>
    </header>

    <section class="hero">
      <h2>Face search with one upload</h2>
      <p>Upload your selfie and scan. Drive link is optional after first save.</p>
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-label">Recent Scans</div>
          <div class="kpi-value">${recentScans.length}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Images Processed</div>
          <div class="kpi-value">${totalScanned}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Matches Found</div>
          <div class="kpi-value">${totalMatches}</div>
        </div>
      </div>
      <p class="hint">${hasSavedDrive ? `Saved Drive: ${escapeHtml(savedDriveId)}` : 'No saved Drive yet. Enter link once and it will be reused.'}</p>
      ${isGuestMode ? '<p class="hint">Guest mode is active. You can still run scans and view your guest history.</p>' : ''}
      <div class="actions-row">
        <a href="${escapeHtml(publicUrl)}" target="_blank" rel="noopener noreferrer">Open Public URL</a>
        <button type="button" data-copy="${escapeHtml(publicUrl)}">Copy Public URL</button>
        <a href="${escapeHtml(publicUrl)}/health" target="_blank" rel="noopener noreferrer">Health</a>
        ${latest ? `<a href="/scan/${latest._id}">Open Latest Scan</a>` : ''}
      </div>
    </section>

    <div class="grid-2">
      <section class="card">
        <h3>Run New Scan</h3>
        <form method="POST" action="/scan" enctype="multipart/form-data" data-scan-form="1">
          <label for="driveLink">Google Drive folder link (optional)</label>
          <input id="driveLink" name="driveLink" type="text" placeholder="Leave blank to use saved link" value="${escapeHtml(savedDriveLink || '')}" />

          <label for="referenceImage">Your reference selfie (max 5MB)</label>
          <input id="referenceImage" name="referenceImage" type="file" accept="image/*" required />

          <button class="btn btn-main" type="submit">Start Face Scan</button>
          <button class="btn btn-alt" type="submit" name="preferSavedDrive" value="1">Scan Using Saved Drive</button>
        </form>
        <p class="hint">Tip: use a clear front-face image. Scanner checks nested subfolders too. First scan indexes metadata once, then next scans reuse cache for faster matching. Current threshold: ${MIN_SIMILARITY}%.</p>
        <p class="hint" data-scan-estimate data-saved-drive-id="${escapeHtml(savedDriveId || '')}">First scan for a new Drive link can take around 5 to 20 minutes depending on folder size. You can keep this page open, or come back later and check All Scans.</p>
        <p class="hint">After you click Start, you will be redirected to a live progress page with exact percentage.</p>
        ${errorMessage ? `<p class="warning">${escapeHtml(errorMessage)}</p>` : ''}
      </section>

      <section class="card">
        <h3>Quick Access</h3>
        <p class="meta-line">Public App URL: <a href="${escapeHtml(publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(publicUrl)}</a></p>
        <p class="meta-line">Results are private per logged-in user. Use <strong>All Scans</strong> to revisit old outputs.</p>
        <div class="actions-row">
          <a href="/scans">Open All Scans</a>
          ${isGuestMode ? '<a href="/sign-in">Sign In With Google</a>' : '<span class="pill">Authenticated via Google</span>'}
          <a href="/logout">Logout</a>
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:20px;">
      <h3>Recent Scans</h3>
      <ul class="scan-list">${listHtml}</ul>
    </section>`
  );
}

function scanProgressPage({ userId, jobId }) {
  const safeJobId = escapeHtml(jobId);
  return pageShell(
    'Scan Progress',
    `<header class="top">
      <h1 class="brand">Face Scan Progress</h1>
      <nav class="nav">
        <span class="pill">User: ${escapeHtml(userId)}</span>
        <a class="pill" href="/">Dashboard</a>
        <a class="pill" href="/scans">All scans</a>
        <a class="pill" href="/logout">Logout</a>
      </nav>
    </header>

    <section class="hero">
      <h2>Running face scan</h2>
      <p>Exact progress updates are shown below. Keep this tab open until it automatically opens the result page.</p>
    </section>

    <section class="card">
      <h3>Live Progress</h3>
      <div class="progress-box" style="display:grid;">
        <p class="progress-title">Scan Job: ${safeJobId}</p>
        <div class="progress-row">
          <span id="jobStage">Queued...</span>
          <strong id="jobPercent">0%</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="jobFill" style="width:0%"></div>
        </div>
        <p class="progress-note" id="jobMeta">Waiting for scanner to start...</p>
      </div>
      <p class="warning" id="jobError" hidden></p>
      <div class="actions-row">
        <a href="/">Back to dashboard</a>
        <a href="/scans">Open all scans</a>
      </div>
    </section>

    <script>
      (function () {
        const jobId = ${JSON.stringify(jobId)};
        const stageEl = document.getElementById('jobStage');
        const percentEl = document.getElementById('jobPercent');
        const fillEl = document.getElementById('jobFill');
        const metaEl = document.getElementById('jobMeta');
        const errorEl = document.getElementById('jobError');
        let stopped = false;

        function formatPercent(value) {
          const n = Number(value || 0);
          if (!Number.isFinite(n)) return '0%';
          const clipped = Math.max(0, Math.min(100, n));
          const text = clipped.toFixed(2).replace(/\\.00$/, '').replace(/(\\.\\d)0$/, '$1');
          return text + '%';
        }

        async function poll() {
          if (stopped) return;
          try {
            const response = await fetch('/api/scan-jobs/' + encodeURIComponent(jobId), {
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            if (!response.ok) {
              throw new Error('Could not fetch scan progress');
            }
            const data = await response.json();
            const percent = Number(data.progressPercent || 0);
            if (stageEl) stageEl.textContent = data.stage || 'Scanning...';
            if (percentEl) percentEl.textContent = formatPercent(percent);
            if (fillEl) fillEl.style.width = Math.max(0, Math.min(100, percent)) + '%';
            if (metaEl) {
              const listed = Number(data.totalFilesListed || 0);
              const completed = Number(data.completedItems || 0);
              const processed = Number(data.processedItems || 0);
              const matched = Number(data.matchedCount || 0);
              const listedText = listed > 0 ? listed : '?';
              metaEl.textContent = 'Completed ' + completed + ' / ' + listedText + ' listed files, processed ' + processed + ', matches ' + matched + '.';
            }

            if (data.status === 'completed' && data.scanId) {
              if (metaEl) metaEl.textContent = 'Scan complete. Opening result...';
              stopped = true;
              window.location.href = '/scan/' + encodeURIComponent(data.scanId);
              return;
            }

            if (data.status === 'failed') {
              stopped = true;
              if (errorEl) {
                errorEl.hidden = false;
                errorEl.textContent = data.errorMessage || 'Scan failed. Please try again.';
              }
              return;
            }
          } catch (err) {
            if (errorEl) {
              errorEl.hidden = false;
              errorEl.textContent = 'Progress fetch failed. Retry in a few seconds or check All Scans.';
            }
          }
          setTimeout(poll, 1000);
        }

        poll();
      })();
    </script>`
  );
}

function scanResultPage({ userId, scan, publicUrl }) {
  const warningHtml = Array.isArray(scan.warnings) && scan.warnings.length
    ? scan.warnings
        .slice(0, 4)
        .map((w) => `<p class="warning">${escapeHtml(w)}</p>`)
        .join('')
    : '';

  const cards = scan.matches
    .map(
      (m) => `<article class="photo">
          <img loading="lazy" src="/preview/${encodeURIComponent(m.fileId)}" data-fallback="${escapeHtml(m.previewUrl || '')}" alt="${escapeHtml(m.fileName)}" />
          <div class="photo-body">
            <div class="photo-name">${escapeHtml(m.fileName)}</div>
            <div class="score">Similarity: ${m.similarity.toFixed(2)}%</div>
            <div class="photo-actions">
              <a href="${m.downloadUrl}" target="_blank" rel="noopener noreferrer">Download</a>
              <a href="${m.webViewLink || `https://drive.google.com/file/d/${m.fileId}/view`}" target="_blank" rel="noopener noreferrer">Open in Drive</a>
            </div>
          </div>
      </article>`
    )
    .join('');

  return pageShell(
    'Scan Results',
    `<header class="top">
      <h1 class="brand">Scan Results</h1>
      <nav class="nav">
        <span class="pill">User: ${escapeHtml(userId)}</span>
        <a class="pill" href="/scans">All scans</a>
        <a class="pill" href="/">New scan</a>
        <a class="pill" href="/logout">Logout</a>
      </nav>
    </header>

    <section class="hero">
      <h2>${scan.matchedCount} match${scan.matchedCount === 1 ? '' : 'es'} found</h2>
      <p>Folder ID: ${escapeHtml(scan.folderId)} | Listed: ${scan.totalFilesListed || scan.totalFilesScanned} images | Processed: ${scan.totalFilesScanned} images | Threshold used: ${scan.minSimilarityUsed}%${scan.adaptiveThresholdUsed ? ' (adaptive)' : ''} | ${new Date(scan.createdAt).toLocaleString()}</p>
      <div class="actions-row">
        <a href="/">Run another scan</a>
        <a href="/scans">View all scans</a>
        <a href="${escapeHtml(publicUrl)}" target="_blank" rel="noopener noreferrer">Public dashboard</a>
      </div>
      ${warningHtml}
    </section>

    ${scan.matches.length ? `<section class="gallery">${cards}</section>` : '<section class="card"><h3>No face match found</h3><p class="hint">Try another selfie with a clear frontal face and enough lighting.</p></section>'}`
  );
}

function scanHistoryPage({ userId, scans }) {
  const rows = scans.length
    ? scans
        .map(
          (scan) => `<tr>
            <td>${new Date(scan.createdAt).toLocaleString()}</td>
            <td>${scan.totalFilesScanned}</td>
            <td>${scan.matchedCount}</td>
            <td>${scan.minSimilarityUsed}%</td>
            <td><a class="pill" href="/scan/${scan._id}">Open</a></td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5">No scan history yet.</td></tr>';

  return pageShell(
    'All Scans',
    `<header class="top">
      <h1 class="brand">All Scan History</h1>
      <nav class="nav">
        <span class="pill">User: ${escapeHtml(userId)}</span>
        <a class="pill" href="/">Dashboard</a>
        <a class="pill" href="/logout">Logout</a>
      </nav>
    </header>

    <section class="card">
      <h3>Scan Log</h3>
      <table class="history-table">
        <thead>
          <tr>
            <th>Created</th>
            <th>Scanned</th>
            <th>Matches</th>
            <th>Threshold</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
  );
}

app.get('/guest-login', (req, res) => {
  const authContext = getAuthContext(req);
  if (authContext.mode === 'google') {
    return res.redirect('/');
  }
  let guestUserId = getGuestUserId(req);
  if (!guestUserId) {
    guestUserId = `${GUEST_USER_PREFIX}${crypto.randomBytes(12).toString('hex')}`;
  }
  setGuestCookie(req, res, guestUserId);
  return res.redirect('/');
});

app.get('/sign-in', (req, res) => {
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
    return res.redirect('/?error=Google%20OAuth%20is%20not%20configured');
  }

  clearGuestCookie(req, res);
  clearAuthCookie(req, res);
  const state = crypto.randomBytes(24).toString('base64url');
  setOAuthStateCookie(req, res, state);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_OAUTH_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', getGoogleOAuthRedirectUri(req));
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('include_granted_scopes', 'true');

  return res.redirect(authUrl.toString());
});

app.get('/sign-up', (req, res) => {
  return res.redirect('/sign-in');
});

app.get('/auth/google/callback', async (req, res) => {
  try {
    const oauthError = String(req.query.error || '').trim();
    if (oauthError) {
      clearOAuthStateCookie(req, res);
      return res.redirect('/?error=Google%20sign-in%20was%20cancelled');
    }

    const expectedState = getOAuthStateCookie(req);
    const returnedState = String(req.query.state || '');
    clearOAuthStateCookie(req, res);
    if (!expectedState || !returnedState || expectedState !== returnedState) {
      return res.redirect('/?error=Google%20sign-in%20state%20mismatch.%20Please%20try%20again.');
    }

    const code = String(req.query.code || '').trim();
    if (!code) {
      return res.redirect('/?error=Google%20sign-in%20code%20missing');
    }

    const tokenPayload = await exchangeGoogleAuthCode({
      code,
      redirectUri: getGoogleOAuthRedirectUri(req),
    });

    const profile = await fetchGoogleProfile({
      idToken: tokenPayload.id_token,
      accessToken: tokenPayload.access_token,
    });

    clearGuestCookie(req, res);
    setAuthCookie(req, res, {
      sub: profile.sub,
      email: profile.email,
      email_verified: profile.email_verified,
      name: profile.name,
      picture: profile.picture,
      iat: Date.now(),
    });

    return res.redirect('/');
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    return res.redirect('/?error=Google%20sign-in%20failed.%20Please%20try%20again.');
  }
});

app.get('/logout', (req, res) => {
  clearGuestCookie(req, res);
  clearAuthCookie(req, res);
  clearOAuthStateCookie(req, res);
  return res.redirect('/');
});

app.get('/', async (req, res) => {
  const authContext = getAuthContext(req);
  const userId = authContext.userId;
  if (!userId) {
    return res.send(guestPage(req));
  }

  const publicUrl = inferPublicUrl(req);

  const [recentScans, userPreference] = await Promise.all([
    FaceScan.find({ clerkUserId: userId })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    UserPreference.findOne({ clerkUserId: userId }).lean(),
  ]);

  return res.send(
    dashboardPage({
      userId,
      authMode: authContext.mode,
      recentScans,
      errorMessage: req.query.error ? String(req.query.error) : '',
      publicUrl,
      savedDriveLink: userPreference?.defaultFolderLink || '',
      savedDriveId: userPreference?.defaultFolderId || '',
    })
  );
});

app.get('/scans', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.redirect('/');
  }

  const scans = await FaceScan.find({ clerkUserId: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return res.send(scanHistoryPage({ userId, scans }));
});

app.post('/scan', upload.single('referenceImage'), async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.redirect('/');
    }

    const rawDriveLink = typeof req.body.driveLink === 'string' ? req.body.driveLink.trim() : '';
    const preferSavedDrive = String(req.body.preferSavedDrive || '') === '1';
    const userPreference = await UserPreference.findOne({ clerkUserId: userId }).lean();

    if (!req.file || !req.file.buffer || !req.file.buffer.length) {
      return res.redirect('/?error=Reference%20image%20is%20required');
    }

    if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
      return res.redirect('/?error=Please%20upload%20a%20valid%20image%20file');
    }

    let folderId = null;
    let effectiveDriveLink = rawDriveLink;
    if (preferSavedDrive || !rawDriveLink) {
      if (userPreference?.defaultFolderId) {
        folderId = String(userPreference.defaultFolderId);
        effectiveDriveLink = userPreference.defaultFolderLink || `https://drive.google.com/drive/folders/${folderId}`;
      } else if (!rawDriveLink) {
        return res.redirect('/?error=No%20saved%20Drive%20link.%20Enter%20a%20Drive%20folder%20link%20once.');
      }
    }

    if (!folderId) {
      folderId = extractDriveFolderId(rawDriveLink);
      if (!folderId) {
        return res.redirect('/?error=Invalid%20Google%20Drive%20folder%20link');
      }
      effectiveDriveLink = rawDriveLink;
    }

    if (!process.env.GOOGLE_API_KEY) {
      return res.redirect('/?error=Missing%20GOOGLE_API_KEY%20in%20environment');
    }

    const scanJob = createScanJob({
      userId,
      folderId,
      effectiveDriveLink,
      rawDriveLink,
      preferSavedDrive,
      referenceImageBuffer: Buffer.from(req.file.buffer),
      referenceImageName: req.file.originalname || 'reference.jpg',
    });

    void runScanJob(scanJob);
    return res.redirect(`/scan-progress/${scanJob.id}`);
  } catch (err) {
    console.error('Scan failed:', err);
    return res.redirect(`/?error=${encodeURIComponent(userFacingScanError(err))}`);
  }
});

app.get('/scan-progress/:jobId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.redirect('/');
  }

  const jobId = String(req.params.jobId || '');
  const job = getOwnedScanJob(jobId, userId);
  if (!job) {
    return res.status(404).send(pageShell('Not Found', '<section class="card"><h3>Scan job not found</h3><a class="pill" href="/">Go to dashboard</a></section>'));
  }

  return res.send(scanProgressPage({ userId, jobId }));
});

app.get('/api/scan-jobs/:jobId', (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const jobId = String(req.params.jobId || '');
  const job = getOwnedScanJob(jobId, userId);
  if (!job) {
    return res.status(404).json({ ok: false, error: 'Scan job not found' });
  }

  return res.json({
    ok: true,
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    progressPercent: job.progressPercent,
    totalFilesListed: job.totalFilesListed,
    completedItems: job.completedItems,
    processedItems: job.processedItems,
    matchedCount: job.matchedCount,
    warnings: job.warnings || [],
    errorMessage: job.errorMessage || '',
    scanId: job.scanId || '',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
});

app.get('/scan/:id', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.redirect('/');
  }

  const publicUrl = inferPublicUrl(req);
  const scan = await FaceScan.findById(req.params.id).lean();

  if (!scan || scan.clerkUserId !== userId) {
    return res.status(404).send(pageShell('Not Found', '<section class="card"><h3>Result not found</h3><a class="pill" href="/">Go to dashboard</a></section>'));
  }

  return res.send(scanResultPage({ userId, scan, publicUrl }));
});

app.get('/preview/:fileId', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).send('Unauthorized');
  }

  const fileId = String(req.params.fileId || '').trim();
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return res.status(400).send('Invalid file id');
  }

  const candidates = buildPreviewCandidateUrls(fileId);
  for (const url of candidates) {
    const preview = await fetchPreviewImage(url);
    if (!preview) {
      continue;
    }
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Content-Type', preview.contentType);
    return res.send(preview.body);
  }

  return res.status(404).send('Preview unavailable');
});

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'drive-face-dashboard' });
});

app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.redirect('/?error=Reference%20image%20must%20be%20under%205MB');
  }

  if (err && /Unauthenticated/i.test(String(err.message || ''))) {
    const wantsJson =
      (req.headers.accept && req.headers.accept.includes('application/json')) ||
      req.path === '/health';
    if (wantsJson) {
      return res.status(401).json({ ok: false, error: 'Unauthenticated' });
    }
    return res.redirect('/');
  }

  console.error('Unhandled error:', err);
  return res.status(500).send('Internal server error');
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
