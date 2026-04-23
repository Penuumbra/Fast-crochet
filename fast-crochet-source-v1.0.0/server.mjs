import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createHash,
  createHmac,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3210);
const HOST = process.env.HOST || "0.0.0.0";
const DATABASE_URL = String(process.env.DATABASE_URL || "").trim();
const STORAGE_MODE = DATABASE_URL ? "postgres" : "file";
const APP_URL = sanitizeBaseUrl(
  process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    `http://localhost:${PORT}`
);
const OPENAI_URL = "https://api.openai.com/v1/responses";
const STRIPE_API_URL = "https://api.stripe.com/v1";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
const FALLBACK_MODELS = ["gpt-4.1-mini", "gpt-4o-mini"];
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "database.json");
const APP_STATE_KEY = "main";

const SESSION_COOKIE = "fio_session";
const TRIAL_COOKIE = "fio_trial";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TRIAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUBSCRIPTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PLAN_NAME = "Plano Essencial";
const PLAN_PRICE_CENTS = 369;
const PLAN_CURRENCY = "BRL";
const PLAN_INTERVAL = "mensal";
const PLAN_PRICE_LABEL = "R$ 3,69";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const PAYMENT_LINK_URL = sanitizeBaseUrl(process.env.PAYMENT_LINK_URL || "");
const PROVIDER_MODE = STRIPE_SECRET_KEY && STRIPE_PRICE_ID
  ? "stripe"
  : PAYMENT_LINK_URL
    ? "payment_link"
    : "demo";
const DEMO_SUBSCRIPTION_ALLOWED =
  PROVIDER_MODE === "demo" || process.env.ALLOW_DEMO_SUBSCRIPTION === "1";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".kt": "text/plain; charset=utf-8",
  ".kts": "text/plain; charset=utf-8",
  ".properties": "text/plain; charset=utf-8",
};

const STITCH_CODES = [
  "sp",
  "ch",
  "sc",
  "hdc",
  "dc",
  "tr",
  "sl",
  "inc",
  "dec",
  "bob",
  "shell",
  "picot",
];

const STYLE_ORDER = ["fiel", "iniciante", "texturizado", "autor"];

const SYSTEM_PROMPT = [
  "You are an expert crochet designer and pattern chart specialist.",
  "Analyze the uploaded image and transform it into four crochet-ready interpretations of the same piece.",
  "Always return Brazilian Portuguese text.",
  "The four styles must use these exact keys in this exact order: fiel, iniciante, texturizado, autor.",
  "Interpret the image as a producible crochet project even if the source image is not crochet.",
  "Keep the diagrams simplified and symbolic, not photorealistic.",
  "Each chart must have exactly 12 rows and each row must have exactly 12 stitch codes.",
  "Use only these stitch codes: sp, ch, sc, hdc, dc, tr, sl, inc, dec, bob, shell, picot.",
  "Use sp only as negative space or shape padding.",
  "Give concise, practical, production-oriented instructions.",
  "Do not mention safety policy, limitations, or inability.",
].join(" ");

let dbQueue = Promise.resolve();
let postgresPool = null;

function objectSchema(properties, required = Object.keys(properties)) {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

function stringArray(minItems, maxItems) {
  return {
    type: "array",
    minItems,
    maxItems,
    items: { type: "string" },
  };
}

const CROCHET_SCHEMA = objectSchema({
  piece_name: { type: "string" },
  confidence: { type: "string", enum: ["low", "medium", "high"] },
  visual_summary: { type: "string" },
  production_note: { type: "string" },
  recommended_materials: stringArray(4, 8),
  styles: {
    type: "array",
    minItems: 4,
    maxItems: 4,
    items: objectSchema({
      key: { type: "string", enum: STYLE_ORDER },
      label: { type: "string" },
      concept: { type: "string" },
      difficulty: {
        type: "string",
        enum: ["iniciante", "intermediario", "avancado"],
      },
      yarn: { type: "string" },
      hook_mm: { type: "number" },
      gauge: { type: "string" },
      palette: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: { type: "string" },
      },
      stitch_legend: {
        type: "array",
        minItems: 4,
        maxItems: 8,
        items: objectSchema({
          code: {
            type: "string",
            enum: STITCH_CODES.filter((code) => code !== "sp"),
          },
          label: { type: "string" },
          use_case: { type: "string" },
        }),
      },
      chart: objectSchema({
        rows: {
          type: "array",
          minItems: 12,
          maxItems: 12,
          items: {
            type: "array",
            minItems: 12,
            maxItems: 12,
            items: {
              type: "string",
              enum: STITCH_CODES,
            },
          },
        },
      }),
      instructions: stringArray(6, 10),
      finishing: stringArray(2, 4),
    }),
  },
});

await ensureDataStore();

function sanitizeBaseUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}

function sanitizeText(value, maxLength = 320) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeEmail(value) {
  return sanitizeText(value, 200).toLowerCase();
}

function sanitizePassword(value) {
  return typeof value === "string" ? value.trim() : "";
}

function now() {
  return Date.now();
}

function plusMs(milliseconds) {
  return new Date(now() + milliseconds).toISOString();
}

function hashPassword(password, salt = randomUUID()) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const attempt = scryptSync(password, salt, 64).toString("hex");
  return safeCompare(attempt, hash);
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  const jar = {};

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.split("=");
    const key = rawKey ? rawKey.trim() : "";
    if (!key) {
      continue;
    }
    jar[key] = decodeURIComponent(rawValue.join("=") || "");
  }

  return jar;
}

function serializeCookie(name, value, options = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`];
  segments.push(`Path=${options.path || "/"}`);
  segments.push(`SameSite=${options.sameSite || "Lax"}`);

  if (options.httpOnly !== false) {
    segments.push("HttpOnly");
  }

  if (options.maxAge !== undefined) {
    segments.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }

  if (options.expires) {
    segments.push(`Expires=${new Date(options.expires).toUTCString()}`);
  }

  if (options.secure) {
    segments.push("Secure");
  }

  return segments.join("; ");
}

function secureCookieFlag(req) {
  return (
    APP_URL.startsWith("https://") ||
    String(req.headers["x-forwarded-proto"] || "").includes("https")
  );
}

function buildPlanPayload() {
  return {
    name: PLAN_NAME,
    price_cents: PLAN_PRICE_CENTS,
    price_label: PLAN_PRICE_LABEL,
    currency: PLAN_CURRENCY,
    interval: PLAN_INTERVAL,
    trial_days: 7,
    provider: PROVIDER_MODE,
    requires_google_play_billing_on_play_store: true,
  };
}

function createInitialDatabase() {
  return {
    users: [],
    sessions: [],
    trials: [],
  };
}

function buildPostgresConfig() {
  if (!DATABASE_URL) {
    return null;
  }

  const sslDisabled =
    DATABASE_URL.includes("sslmode=disable") ||
    process.env.DATABASE_SSLMODE === "disable";

  return {
    connectionString: DATABASE_URL,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  };
}

function getPostgresPool() {
  if (!DATABASE_URL) {
    return null;
  }

  if (!postgresPool) {
    postgresPool = new Pool(buildPostgresConfig());
  }

  return postgresPool;
}

async function ensureDataStore() {
  if (STORAGE_MODE === "postgres") {
    const pool = getPostgresPool();
    const initialData = JSON.stringify(createInitialDatabase());

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        state_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(
      `
        INSERT INTO app_state (state_key, payload)
        VALUES ($1, $2::jsonb)
        ON CONFLICT (state_key) DO NOTHING
      `,
      [APP_STATE_KEY, initialData]
    );

    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    const initialData = createInitialDatabase();
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

async function readDatabase() {
  if (STORAGE_MODE === "postgres") {
    const pool = getPostgresPool();
    const result = await pool.query(
      "SELECT payload FROM app_state WHERE state_key = $1 LIMIT 1",
      [APP_STATE_KEY]
    );
    const payload = result.rows[0]?.payload;
    return payload || createInitialDatabase();
  }

  const raw = await fs.readFile(DB_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeDatabase(db) {
  if (STORAGE_MODE === "postgres") {
    const pool = getPostgresPool();
    await pool.query(
      `
        UPDATE app_state
        SET payload = $2::jsonb, updated_at = NOW()
        WHERE state_key = $1
      `,
      [APP_STATE_KEY, JSON.stringify(db)]
    );
    return;
  }

  const tmpFile = `${DB_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmpFile, DB_FILE);
}

function withDatabase(mutator) {
  const task = dbQueue.then(async () => {
    const db = await readDatabase();
    const result = await mutator(db);
    await writeDatabase(db);
    return result;
  });

  dbQueue = task.catch(() => {});
  return task;
}

function readDatabaseView(reader) {
  const task = dbQueue.then(async () => {
    const db = await readDatabase();
    return reader(db);
  });

  dbQueue = task.catch(() => {});
  return task;
}

async function checkDataStoreHealth() {
  if (STORAGE_MODE === "postgres") {
    const pool = getPostgresPool();
    await pool.query("SELECT 1");
    return { mode: STORAGE_MODE };
  }

  await fs.access(DB_FILE);
  return { mode: STORAGE_MODE };
}

function readBodyBuffer(req, byteLimit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > byteLimit) {
        reject(new Error("Payload muito grande."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function parseJsonBody(req, byteLimit = MAX_BODY_BYTES) {
  const buffer = await readBodyBuffer(req, byteLimit);
  if (!buffer.length) {
    return {};
  }

  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new Error("Corpo da requisicao invalido.");
  }
}

function getClientFingerprint(req) {
  const remoteAddress = req.socket.remoteAddress || "unknown";
  const userAgent = String(req.headers["user-agent"] || "unknown");
  const language = String(req.headers["accept-language"] || "unknown");
  return createHash("sha256")
    .update(`${remoteAddress}|${userAgent}|${language}`)
    .digest("hex")
    .slice(0, 48);
}

function purgeExpiredRecords(db) {
  const currentTime = now();
  db.sessions = db.sessions.filter((session) => new Date(session.expires_at).getTime() > currentTime);
}

function getTrialRecord(db, cookies, req) {
  const fingerprint = getClientFingerprint(req);
  const cookieTrialId = cookies[TRIAL_COOKIE] || "";
  let trial = db.trials.find((item) => item.id === cookieTrialId) || null;
  let created = false;
  let adopted = false;

  if (!trial) {
    const matching = db.trials
      .filter((item) => item.client_fingerprint === fingerprint && !item.linked_user_id)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    trial = matching[0] || null;
    adopted = Boolean(trial);
  }

  if (!trial) {
    trial = {
      id: `trial_${randomUUID()}`,
      created_at: new Date().toISOString(),
      expires_at: plusMs(TRIAL_TTL_MS),
      last_seen_at: new Date().toISOString(),
      client_fingerprint: fingerprint,
      linked_user_id: null,
    };
    db.trials.push(trial);
    created = true;
  }

  trial.last_seen_at = new Date().toISOString();

  return {
    trial,
    created,
    adopted,
  };
}

function getSessionRecord(db, cookies) {
  const sessionId = cookies[SESSION_COOKIE] || "";
  if (!sessionId) {
    return { session: null, user: null, clearCookie: false };
  }

  const session = db.sessions.find((item) => item.id === sessionId) || null;
  if (!session) {
    return { session: null, user: null, clearCookie: true };
  }

  const expiresAt = new Date(session.expires_at).getTime();
  if (expiresAt <= now()) {
    db.sessions = db.sessions.filter((item) => item.id !== session.id);
    return { session: null, user: null, clearCookie: true };
  }

  session.last_seen_at = new Date().toISOString();
  const user = db.users.find((item) => item.id === session.user_id) || null;
  if (!user) {
    db.sessions = db.sessions.filter((item) => item.id !== session.id);
    return { session: null, user: null, clearCookie: true };
  }

  return { session, user, clearCookie: false };
}

function isIsoFuture(value) {
  if (!value) {
    return false;
  }
  return new Date(value).getTime() > now();
}

function isSubscriptionActive(subscription) {
  if (!subscription) {
    return false;
  }
  return (
    ["active", "trialing"].includes(subscription.status) &&
    (!subscription.current_period_end || isIsoFuture(subscription.current_period_end))
  );
}

function normalizeSubscriptionStatus(status) {
  if (status === "trialing") {
    return "trialing";
  }
  if (status === "active") {
    return "active";
  }
  if (status === "canceled") {
    return "canceled";
  }
  if (status === "past_due" || status === "unpaid" || status === "incomplete") {
    return "inactive";
  }
  return status || "inactive";
}

function subscriptionLabel(status) {
  switch (normalizeSubscriptionStatus(status)) {
    case "active":
      return "Assinatura ativa";
    case "trialing":
      return "Em periodo promocional";
    case "canceled":
      return "Assinatura cancelada";
    default:
      return "Assinatura inativa";
  }
}

function linkTrialToUser(user, trial) {
  if (!trial) {
    return;
  }

  trial.linked_user_id = user.id;

  if (!user.trial_ends_at || new Date(user.trial_ends_at).getTime() < new Date(trial.expires_at).getTime()) {
    user.trial_ends_at = trial.expires_at;
  }
}

function buildTrialPayload(user, trial) {
  const source = user?.trial_ends_at
    ? { source: "account", starts_at: user.created_at, expires_at: user.trial_ends_at }
    : trial
      ? { source: "anonymous", starts_at: trial.created_at, expires_at: trial.expires_at }
      : null;

  if (!source) {
    return null;
  }

  const expiresAtMs = new Date(source.expires_at).getTime();
  const remainingMs = Math.max(0, expiresAtMs - now());

  return {
    source: source.source,
    active: remainingMs > 0,
    expired: remainingMs <= 0,
    started_at: source.starts_at,
    expires_at: source.expires_at,
    remaining_days: Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
    remaining_hours: Math.ceil(remainingMs / (60 * 60 * 1000)),
    remaining_percent: Math.max(0, Math.min(100, Math.round((remainingMs / TRIAL_TTL_MS) * 100))),
  };
}

function safeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    trial_ends_at: user.trial_ends_at || null,
  };
}

function safeSubscription(subscription) {
  if (!subscription) {
    return null;
  }

  return {
    status: normalizeSubscriptionStatus(subscription.status),
    label: subscriptionLabel(subscription.status),
    active: isSubscriptionActive(subscription),
    provider: subscription.provider || PROVIDER_MODE,
    price_label: PLAN_PRICE_LABEL,
    current_period_end: subscription.current_period_end || null,
    activated_at: subscription.activated_at || null,
  };
}

function buildAccessMode({ user, subscription, trialPayload }) {
  const subscriptionActive = isSubscriptionActive(subscription);
  const trialActive = Boolean(trialPayload?.active);

  if (subscriptionActive) {
    return {
      mode: "authenticated_subscriber",
      can_generate: true,
      reason: "Sua assinatura esta ativa.",
    };
  }

  if (user && trialActive) {
    return {
      mode: "authenticated_trial",
      can_generate: true,
      reason: "Seu teste gratis esta ativo na conta.",
    };
  }

  if (!user && trialActive) {
    return {
      mode: "anonymous_trial",
      can_generate: true,
      reason: "Seu teste gratis esta ativo sem cadastro.",
    };
  }

  if (user) {
    return {
      mode: "subscription_required",
      can_generate: false,
      reason: "O teste terminou. Assine para continuar usando o app.",
    };
  }

  return {
    mode: "auth_required",
    can_generate: false,
    reason: "O teste terminou. Entre ou crie sua conta para continuar.",
  };
}

function buildSnapshot({ user, subscription, trialPayload, access }) {
  return {
    plan: buildPlanPayload(),
    access: {
      ...access,
      login_required_after_trial: true,
    },
    user: safeUser(user),
    subscription: safeSubscription(subscription),
    trial: trialPayload,
  };
}

function clearCookieHeader(name, req) {
  return serializeCookie(name, "", {
    path: "/",
    sameSite: "Lax",
    httpOnly: true,
    maxAge: 0,
    expires: 0,
    secure: secureCookieFlag(req),
  });
}

function buildSessionCookie(sessionId, req) {
  return serializeCookie(SESSION_COOKIE, sessionId, {
    path: "/",
    sameSite: "Lax",
    httpOnly: true,
    maxAge: SESSION_TTL_MS / 1000,
    secure: secureCookieFlag(req),
  });
}

function buildTrialCookie(trialId, req) {
  return serializeCookie(TRIAL_COOKIE, trialId, {
    path: "/",
    sameSite: "Lax",
    httpOnly: true,
    maxAge: TRIAL_TTL_MS / 1000,
    secure: secureCookieFlag(req),
  });
}

function cloneRequestWithCookie(req, additions = {}) {
  const cookieValues = [req.headers.cookie || ""];

  for (const [key, value] of Object.entries(additions)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    cookieValues.push(`${key}=${value}`);
  }

  return {
    headers: {
      ...req.headers,
      cookie: cookieValues.filter(Boolean).join("; "),
    },
    socket: req.socket,
  };
}

function resolveAccessState(db, req, { createTrial = true } = {}) {
  purgeExpiredRecords(db);
  const cookies = parseCookies(req);
  const cookieHeaders = [];
  const sessionState = getSessionRecord(db, cookies);

  if (sessionState.clearCookie) {
    cookieHeaders.push(clearCookieHeader(SESSION_COOKIE, req));
  }

  let trial = null;
  if (createTrial) {
    const trialState = getTrialRecord(db, cookies, req);
    trial = trialState.trial;
    if (trialState.created || trialState.adopted || cookies[TRIAL_COOKIE] !== trial.id) {
      cookieHeaders.push(buildTrialCookie(trial.id, req));
    }
  } else if (cookies[TRIAL_COOKIE]) {
    trial = db.trials.find((item) => item.id === cookies[TRIAL_COOKIE]) || null;
  }

  const user = sessionState.user;
  if (user && trial && new Date(trial.expires_at).getTime() > now()) {
    linkTrialToUser(user, trial);
  }

  const subscription = user?.subscription || null;
  const trialPayload = buildTrialPayload(user, trial);
  const access = buildAccessMode({
    user,
    subscription,
    trialPayload,
  });

  return {
    cookieHeaders,
    session: sessionState.session,
    trial,
    user,
    subscription,
    snapshot: buildSnapshot({
      user,
      subscription,
      trialPayload,
      access,
    }),
  };
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, html, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    ...extraHeaders,
  });
  res.end(html);
}

function buildApiError(statusCode, message, code, snapshot) {
  return {
    error: message,
    code,
    ...(snapshot ? { snapshot } : {}),
  };
}

function validateRegistration(email, password) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Informe um e-mail valido.");
  }

  if (password.length < 6) {
    throw new Error("A senha precisa ter pelo menos 6 caracteres.");
  }
}

async function createStripeCheckoutSession(user) {
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${APP_URL}/?checkout=success`);
  params.set("cancel_url", `${APP_URL}/?checkout=cancel`);
  params.set("line_items[0][price]", STRIPE_PRICE_ID);
  params.set("line_items[0][quantity]", "1");
  params.set("customer_email", user.email);
  params.set("client_reference_id", user.id);
  params.set("metadata[user_id]", user.id);
  params.set("subscription_data[metadata][user_id]", user.id);

  const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Falha ao criar o checkout de assinatura.");
  }

  return payload;
}

function parseStripeSignature(signatureHeader) {
  const entries = {};
  for (const part of String(signatureHeader || "").split(",")) {
    const [key, value] = part.split("=", 2);
    if (key && value) {
      entries[key] = value;
    }
  }
  return entries;
}

function verifyStripeWebhook(rawBody, signatureHeader) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return false;
  }

  const parts = parseStripeSignature(signatureHeader);
  if (!parts.t || !parts.v1) {
    return false;
  }

  const expected = createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(`${parts.t}.${rawBody}`)
    .digest("hex");

  return safeCompare(expected, parts.v1);
}

function updateUserSubscriptionFromStripe(user, object, fallbackStatus = "active") {
  const nextStatus = normalizeSubscriptionStatus(object.status || fallbackStatus);
  const currentPeriodEnd = object.current_period_end
    ? new Date(object.current_period_end * 1000).toISOString()
    : user.subscription?.current_period_end || plusMs(SUBSCRIPTION_TTL_MS);

  user.subscription = {
    status: nextStatus,
    provider: "stripe",
    activated_at: user.subscription?.activated_at || new Date().toISOString(),
    current_period_end: currentPeriodEnd,
    stripe_customer_id: object.customer || user.subscription?.stripe_customer_id || null,
    stripe_subscription_id: object.id || user.subscription?.stripe_subscription_id || null,
    last_event_at: new Date().toISOString(),
  };
}

function objectSchemaRequiredString(body, key, maxLength) {
  const value = sanitizeText(body?.[key], maxLength);
  if (!value) {
    throw new Error(`Campo obrigatorio ausente: ${key}.`);
  }
  return value;
}

function isRecoverableModelError(status, payload) {
  const message = String(payload?.error?.message || "");
  const code = String(payload?.error?.code || "");
  return (
    [400, 403, 404].includes(status) &&
    /(model|access|permission|not available|not found|unsupported)/i.test(
      `${message} ${code}`
    )
  );
}

function extractJsonText(responsePayload) {
  if (typeof responsePayload?.output_text === "string" && responsePayload.output_text.trim()) {
    return responsePayload.output_text.trim();
  }

  const outputItems = Array.isArray(responsePayload?.output)
    ? responsePayload.output
    : [];

  for (const item of outputItems) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string") {
        return part.text.trim();
      }
      if (part?.type === "refusal" && typeof part.refusal === "string") {
        throw new Error(`A IA recusou este pedido: ${part.refusal}`);
      }
    }
  }

  throw new Error("A resposta da IA nao veio em texto estruturado.");
}

function normalizeResult(parsed) {
  const styles = Array.isArray(parsed?.styles) ? parsed.styles.slice() : [];
  styles.sort(
    (left, right) =>
      STYLE_ORDER.indexOf(left?.key || "") - STYLE_ORDER.indexOf(right?.key || "")
  );

  return {
    ...parsed,
    styles,
  };
}

function assertGenerateRequest(body) {
  const imageDataUrl = String(body?.imageDataUrl || "");
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Envie uma imagem valida antes de gerar o padrao.");
  }

  const model = sanitizeText(body?.model, 80) || DEFAULT_MODEL;
  const apiKey = sanitizeText(body?.apiKey, 200);
  const pieceType = sanitizeText(body?.pieceType, 80);
  const skillLevel = sanitizeText(body?.skillLevel, 40) || "intermediario";
  const sizeTarget = sanitizeText(body?.sizeTarget, 120);
  const notes = sanitizeText(body?.notes, 400);

  return {
    apiKey,
    imageDataUrl,
    model,
    notes,
    pieceType,
    sizeTarget,
    skillLevel,
  };
}

function buildPrompt({ pieceType, skillLevel, sizeTarget, notes }) {
  return [
    "Transforme a imagem em uma receita de croche pronta para producao.",
    pieceType
      ? `Tipo de peca desejado: ${pieceType}.`
      : "Escolha o tipo de peca mais coerente com a imagem.",
    `Nivel alvo: ${skillLevel}.`,
    sizeTarget ? `Tamanho ou escala desejada: ${sizeTarget}.` : "",
    notes ? `Observacoes extras do usuario: ${notes}.` : "",
    "Entregue 4 estilos da mesma peca: fiel ao original, simplificado para iniciantes, texturizado com relevo e uma versao autoral.",
    "Em cada estilo, sugira fio, agulha, paleta, legenda de pontos, diagrama 12x12 e instrucoes de producao.",
    "Se a imagem tiver roupas, bolsas, objetos ou decoracao, adapte para croche de forma plausivel.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function requestPatternFromOpenAI({ apiKey, imageDataUrl, model, promptText }) {
  const requestBody = {
    model,
    instructions: SYSTEM_PROMPT,
    max_output_tokens: 6000,
    text: {
      format: {
        type: "json_schema",
        name: "crochet_pattern_variants",
        strict: true,
        schema: CROCHET_SCHEMA,
      },
    },
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: promptText,
          },
          {
            type: "input_image",
            image_url: imageDataUrl,
            detail: "high",
          },
        ],
      },
    ],
  };

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

async function handleAccess(req, res) {
  const result = await withDatabase(async (db) => resolveAccessState(db, req));
  sendJson(res, 200, result.snapshot, result.cookieHeaders.length
    ? { "Set-Cookie": result.cookieHeaders }
    : {});
}

async function handleRegister(req, res) {
  try {
    const body = await parseJsonBody(req);
    const email = sanitizeEmail(objectSchemaRequiredString(body, "email", 200));
    const password = sanitizePassword(objectSchemaRequiredString(body, "password", 200));
    validateRegistration(email, password);

    const result = await withDatabase(async (db) => {
      const accessState = resolveAccessState(db, req);
      if (accessState.user) {
        throw new Error("Voce ja esta autenticado.");
      }

      const existingUser = db.users.find((item) => item.email === email);
      if (existingUser) {
        const error = new Error("Este e-mail ja esta cadastrado.");
        error.statusCode = 409;
        throw error;
      }

      const passwordRecord = hashPassword(password);
      const user = {
        id: `usr_${randomUUID()}`,
        email,
        password_hash: passwordRecord.hash,
        password_salt: passwordRecord.salt,
        created_at: new Date().toISOString(),
        trial_ends_at: null,
        subscription: null,
      };

      if (accessState.trial && isIsoFuture(accessState.trial.expires_at)) {
        linkTrialToUser(user, accessState.trial);
      }

      db.users.push(user);

      const session = {
        id: `ses_${randomUUID()}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
        expires_at: plusMs(SESSION_TTL_MS),
        last_seen_at: new Date().toISOString(),
      };
      db.sessions.push(session);

      const nextAccess = resolveAccessState(
        db,
        cloneRequestWithCookie(req, {
          [SESSION_COOKIE]: session.id,
          [TRIAL_COOKIE]: accessState.trial?.id || undefined,
        }),
        { createTrial: true }
      );

      return {
        cookieHeaders: [
          ...nextAccess.cookieHeaders,
          buildSessionCookie(session.id, req),
        ],
        snapshot: nextAccess.snapshot,
      };
    });

    sendJson(res, 201, {
      message: "Conta criada com sucesso.",
      ...result.snapshot,
    }, { "Set-Cookie": result.cookieHeaders });
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      error: error instanceof Error ? error.message : "Falha ao criar a conta.",
    });
  }
}

async function handleLogin(req, res) {
  try {
    const body = await parseJsonBody(req);
    const email = sanitizeEmail(objectSchemaRequiredString(body, "email", 200));
    const password = sanitizePassword(objectSchemaRequiredString(body, "password", 200));

    const result = await withDatabase(async (db) => {
      const accessState = resolveAccessState(db, req);
      const user = db.users.find((item) => item.email === email);
      if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
        const error = new Error("E-mail ou senha invalidos.");
        error.statusCode = 401;
        throw error;
      }

      if (accessState.trial && isIsoFuture(accessState.trial.expires_at)) {
        linkTrialToUser(user, accessState.trial);
      }

      const session = {
        id: `ses_${randomUUID()}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
        expires_at: plusMs(SESSION_TTL_MS),
        last_seen_at: new Date().toISOString(),
      };
      db.sessions = db.sessions.filter((item) => item.user_id !== user.id);
      db.sessions.push(session);

      const nextAccess = resolveAccessState(
        db,
        cloneRequestWithCookie(req, {
          [SESSION_COOKIE]: session.id,
          [TRIAL_COOKIE]: accessState.trial?.id || undefined,
        }),
        { createTrial: true }
      );

      return {
        cookieHeaders: [
          ...nextAccess.cookieHeaders,
          buildSessionCookie(session.id, req),
        ],
        snapshot: nextAccess.snapshot,
      };
    });

    sendJson(res, 200, {
      message: "Login realizado com sucesso.",
      ...result.snapshot,
    }, { "Set-Cookie": result.cookieHeaders });
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      error: error instanceof Error ? error.message : "Falha ao autenticar.",
    });
  }
}

async function handleLogout(req, res) {
  const cookies = parseCookies(req);
  const sessionId = cookies[SESSION_COOKIE] || "";

  await withDatabase(async (db) => {
    db.sessions = db.sessions.filter((item) => item.id !== sessionId);
    return null;
  });

  const accessState = await withDatabase(async (db) => resolveAccessState(db, req));
  sendJson(res, 200, {
    message: "Sessao encerrada.",
    ...accessState.snapshot,
  }, {
    "Set-Cookie": [
      ...(accessState.cookieHeaders || []),
      clearCookieHeader(SESSION_COOKIE, req),
    ],
  });
}

async function handleCheckout(req, res) {
  try {
    const result = await withDatabase(async (db) => {
      const accessState = resolveAccessState(db, req);
      if (!accessState.user) {
        const error = new Error("Entre na conta antes de assinar.");
        error.statusCode = 401;
        throw error;
      }

      if (isSubscriptionActive(accessState.subscription)) {
        return {
          payload: {
            message: "Sua assinatura ja esta ativa.",
            ...accessState.snapshot,
          },
        };
      }

      if (PROVIDER_MODE === "stripe") {
        const checkout = await createStripeCheckoutSession(accessState.user);
        return {
          payload: {
            checkout_url: checkout.url,
            provider: "stripe",
            mode: "redirect",
            message: "Checkout criado com sucesso.",
            ...accessState.snapshot,
          },
        };
      }

      if (PROVIDER_MODE === "payment_link") {
        return {
          payload: {
            checkout_url: PAYMENT_LINK_URL,
            provider: "payment_link",
            mode: "redirect",
            message: "Redirecione o usuario para o link de pagamento.",
            ...accessState.snapshot,
          },
        };
      }

      return {
        payload: {
          provider: "demo",
          mode: "demo",
          demo_available: DEMO_SUBSCRIPTION_ALLOWED,
          message: "Modo local: ative a assinatura de demonstracao para testar o fluxo.",
          ...accessState.snapshot,
        },
      };
    });

    sendJson(res, 200, result.payload);
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      error: error instanceof Error ? error.message : "Falha ao iniciar o checkout.",
    });
  }
}

async function handleDemoActivation(req, res) {
  try {
    if (!DEMO_SUBSCRIPTION_ALLOWED) {
      sendJson(res, 403, { error: "Assinatura de demonstracao desativada." });
      return;
    }

    const result = await withDatabase(async (db) => {
      const accessState = resolveAccessState(db, req);
      if (!accessState.user) {
        const error = new Error("Entre na conta antes de ativar a assinatura.");
        error.statusCode = 401;
        throw error;
      }

      accessState.user.subscription = {
        status: "active",
        provider: "demo",
        activated_at: new Date().toISOString(),
        current_period_end: plusMs(SUBSCRIPTION_TTL_MS),
      };

      const nextAccess = resolveAccessState(db, req);
      return nextAccess.snapshot;
    });

    sendJson(res, 200, {
      message: "Assinatura local ativada por 30 dias.",
      ...result,
    });
  } catch (error) {
    sendJson(res, error.statusCode || 400, {
      error: error instanceof Error ? error.message : "Falha ao ativar assinatura.",
    });
  }
}

async function handleStripeWebhook(req, res) {
  if (!STRIPE_WEBHOOK_SECRET) {
    sendJson(res, 404, { error: "Webhook do Stripe nao configurado." });
    return;
  }

  try {
    const buffer = await readBodyBuffer(req, 2 * 1024 * 1024);
    const rawBody = buffer.toString("utf8");
    const signatureHeader = req.headers["stripe-signature"] || "";

    if (!verifyStripeWebhook(rawBody, signatureHeader)) {
      sendJson(res, 400, { error: "Assinatura do webhook invalida." });
      return;
    }

    const event = JSON.parse(rawBody);

    await withDatabase(async (db) => {
      const object = event?.data?.object || {};
      const userByReference = db.users.find((item) => item.id === object.client_reference_id);
      const userByCustomer = db.users.find(
        (item) => item.subscription?.stripe_customer_id && item.subscription.stripe_customer_id === object.customer
      );
      const userBySubscription = db.users.find(
        (item) => item.subscription?.stripe_subscription_id && item.subscription.stripe_subscription_id === object.id
      );
      const userByEmail = db.users.find((item) => item.email === object.customer_email);
      const user = userByReference || userBySubscription || userByCustomer || userByEmail || null;

      if (!user) {
        return null;
      }

      switch (event.type) {
        case "checkout.session.completed":
          user.subscription = {
            status: "active",
            provider: "stripe",
            activated_at: user.subscription?.activated_at || new Date().toISOString(),
            current_period_end: user.subscription?.current_period_end || plusMs(SUBSCRIPTION_TTL_MS),
            stripe_customer_id: object.customer || null,
            stripe_subscription_id: object.subscription || null,
          };
          break;
        case "customer.subscription.created":
        case "customer.subscription.updated":
          updateUserSubscriptionFromStripe(user, object, object.status || "active");
          break;
        case "customer.subscription.deleted":
          user.subscription = {
            ...(user.subscription || {}),
            status: "canceled",
            provider: "stripe",
            current_period_end: object.current_period_end
              ? new Date(object.current_period_end * 1000).toISOString()
              : user.subscription?.current_period_end || null,
            stripe_customer_id: object.customer || user.subscription?.stripe_customer_id || null,
            stripe_subscription_id: object.id || user.subscription?.stripe_subscription_id || null,
          };
          break;
        case "invoice.payment_failed":
          user.subscription = {
            ...(user.subscription || {}),
            status: "inactive",
            provider: "stripe",
            stripe_customer_id: object.customer || user.subscription?.stripe_customer_id || null,
          };
          break;
        case "invoice.paid":
          user.subscription = {
            ...(user.subscription || {}),
            status: "active",
            provider: "stripe",
            current_period_end: user.subscription?.current_period_end || plusMs(SUBSCRIPTION_TTL_MS),
            stripe_customer_id: object.customer || user.subscription?.stripe_customer_id || null,
            activated_at: user.subscription?.activated_at || new Date().toISOString(),
          };
          break;
        default:
          break;
      }

      return null;
    });

    sendJson(res, 200, { received: true });
  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : "Falha ao processar webhook.",
    });
  }
}

async function handleGenerate(req, res) {
  try {
    const body = await parseJsonBody(req);
    const request = assertGenerateRequest(body);
    const accessState = await withDatabase(async (db) => resolveAccessState(db, req));

    if (!accessState.snapshot.access.can_generate) {
      const statusCode = accessState.snapshot.access.mode === "auth_required" ? 401 : 402;
      sendJson(
        res,
        statusCode,
        buildApiError(
          statusCode,
          accessState.snapshot.access.reason,
          accessState.snapshot.access.mode,
          accessState.snapshot
        ),
        accessState.cookieHeaders.length ? { "Set-Cookie": accessState.cookieHeaders } : {}
      );
      return;
    }

    const apiKey = request.apiKey || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      sendJson(res, 400, {
        error: "Configure OPENAI_API_KEY no servidor ou informe a chave em modo desenvolvedor.",
      });
      return;
    }

    const promptText = buildPrompt(request);
    const candidateModels = [request.model, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(
      (modelName, index, collection) =>
        Boolean(modelName) && collection.indexOf(modelName) === index
    );

    let lastFailure = null;

    for (const modelName of candidateModels) {
      const upstream = await requestPatternFromOpenAI({
        apiKey,
        imageDataUrl: request.imageDataUrl,
        model: modelName,
        promptText,
      });

      if (upstream.ok) {
        const rawText = extractJsonText(upstream.payload);
        const parsed = JSON.parse(rawText);
        const normalized = normalizeResult(parsed);

        sendJson(res, 200, {
          result: normalized,
          meta: {
            fallback_used: modelName !== request.model,
            model: upstream.payload?.model || modelName,
            response_id: upstream.payload?.id || null,
            access_mode: accessState.snapshot.access.mode,
          },
        }, accessState.cookieHeaders.length ? { "Set-Cookie": accessState.cookieHeaders } : {});
        return;
      }

      lastFailure = upstream.payload;

      if (!isRecoverableModelError(upstream.status, upstream.payload)) {
        sendJson(res, upstream.status, {
          error:
            upstream.payload?.error?.message ||
            "Falha ao consultar a API da OpenAI.",
        });
        return;
      }
    }

    sendJson(res, 502, {
      error:
        lastFailure?.error?.message ||
        "Nao foi possivel encontrar um modelo compativel para gerar o padrao.",
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Erro inesperado no servidor.",
    });
  }
}

async function serveStatic(res, urlPath) {
  const normalizedPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
  const filePath = path.resolve(__dirname, normalizedPath);

  if (!filePath.startsWith(__dirname)) {
    sendJson(res, 403, { error: "Acesso negado." });
    return;
  }

  try {
    const fileBuffer = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(fileBuffer);
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendHtml(res, 404, "<h1>Arquivo nao encontrado</h1>");
      return;
    }

    sendJson(res, 500, { error: "Falha ao carregar o arquivo solicitado." });
  }
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (requestUrl.pathname === "/health") {
    try {
      const storage = await checkDataStoreHealth();
      sendJson(res, 200, {
        ok: true,
        port: PORT,
        plan: buildPlanPayload(),
        provider_mode: PROVIDER_MODE,
        storage_mode: storage.mode,
      });
    } catch (error) {
      sendJson(res, 503, {
        ok: false,
        error: error instanceof Error ? error.message : "Falha no datastore.",
        provider_mode: PROVIDER_MODE,
        storage_mode: STORAGE_MODE,
      });
    }
    return;
  }

  if (requestUrl.pathname === "/api/access" && req.method === "GET") {
    await handleAccess(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/auth/register" && req.method === "POST") {
    await handleRegister(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/auth/login" && req.method === "POST") {
    await handleLogin(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/auth/logout" && req.method === "POST") {
    await handleLogout(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/subscription/checkout" && req.method === "POST") {
    await handleCheckout(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/subscription/demo-activate" && req.method === "POST") {
    await handleDemoActivation(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/subscription/webhook" && req.method === "POST") {
    await handleStripeWebhook(req, res);
    return;
  }

  if (requestUrl.pathname === "/api/generate" && req.method === "POST") {
    await handleGenerate(req, res);
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    sendJson(res, 404, { error: "Endpoint nao encontrado." });
    return;
  }

  if (!["GET", "HEAD"].includes(req.method || "GET")) {
    sendJson(res, 405, { error: "Metodo nao permitido." });
    return;
  }

  await serveStatic(res, requestUrl.pathname);
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log(`Fast Crochet rodando em ${APP_URL}`);
  console.log(`Plano: ${PLAN_PRICE_LABEL} por mes com 7 dias gratis.`);
  console.log(`Checkout: ${PROVIDER_MODE}`);
  console.log(`Persistencia: ${STORAGE_MODE}`);
  console.log("Use Ctrl+C para encerrar.");
  console.log("");
});
