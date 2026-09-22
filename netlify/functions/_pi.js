const PI_API_BASE = "https://api.minepi.com/v2";
const SUPPORT_PAYMENT = Object.freeze({ amount: 0.1, memo: "SARAVIA Testnet support" });
const WELCOME_PAYMENT = Object.freeze({ amount: 0.1, memo: "SARAVIA Testnet welcome bonus" });

function httpError(statusCode, message, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    },
    body: JSON.stringify(body)
  };
}

function methodGuard(event) {
  if (event.httpMethod !== "POST") throw httpError(405, "Method not allowed");
}

function bodyOf(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    throw httpError(400, "Request body must be valid JSON");
  }
}

function requiredString(value, name, maxLength) {
  if (typeof value !== "string" || value.trim() === "") throw httpError(400, name + " is required");
  const result = value.trim();
  if (result.length > (maxLength || 512)) throw httpError(400, name + " is too long");
  return result;
}

function requireTestnetEnv(requireWallet) {
  if (process.env.PI_NETWORK !== "testnet") throw httpError(503, "This function is available only on Pi Testnet");
  for (const name of ["PI_API_KEY", "PI_APP_ID"]) {
    if (!process.env[name]) throw httpError(503, "Testnet Pi configuration is incomplete");
  }
  if (requireWallet && !process.env.PI_APP_WALLET_PRIVATE_SEED) {
    throw httpError(503, "The Testnet app wallet is not configured");
  }
}

function safeError(error) {
  return error && error.message ? String(error.message).slice(0, 240) : "Unexpected server error";
}

function handleError(error) {
  const statusCode = Number.isInteger(error && error.statusCode) ? error.statusCode : 500;
  return json(statusCode, { error: statusCode >= 500 ? "Testnet payment service unavailable" : safeError(error) });
}

async function piFetch(path, options) {
  requireTestnetEnv(false);
  const request = options || {};
  const headers = Object.assign({
    Accept: "application/json",
    Authorization: "Key " + process.env.PI_API_KEY
  }, request.body ? { "content-type": "application/json" } : {}, request.headers || {});
  const response = await fetch(PI_API_BASE + path, Object.assign({}, request, { headers }));
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { error: text }; }
  if (!response.ok) throw httpError(response.status >= 500 ? 502 : response.status, "Pi Platform API request failed", data);
  return data;
}

async function verifyAccessToken(accessToken) {
  requireTestnetEnv(false);
  const token = requiredString(accessToken, "accessToken", 4096);
  const response = await fetch(PI_API_BASE + "/me", {
    headers: { Accept: "application/json", Authorization: "Bearer " + token }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok || !data || !data.uid) throw httpError(response.status === 401 ? 401 : 502, "Pi login verification failed");
  const walletAddress = data.wallet_address || data.walletAddress || null;
  if (!walletAddress) throw httpError(403, "Wallet access was not granted. Sign in again and allow wallet access.");
  return { uid: String(data.uid), username: data.username ? String(data.username) : "Pioneer", wallet_address: String(walletAddress) };
}

function unwrapPayment(value) {
  return value && value.payment ? value.payment : value;
}

function assertSupportPayment(payment) {
  const item = unwrapPayment(payment);
  if (!item || item.amount !== SUPPORT_PAYMENT.amount || item.memo !== SUPPORT_PAYMENT.memo) {
    throw httpError(400, "This payment is not a SARAVIA Testnet support payment");
  }
  if (item.network && String(item.network).toLowerCase().includes("main")) {
    throw httpError(400, "Mainnet payments are not accepted here");
  }
  if (item.metadata && item.metadata.type && item.metadata.type !== "support") {
    throw httpError(400, "This payment has invalid metadata");
  }
  return item;
}

function assertWelcomePayment(payment) {
  const item = unwrapPayment(payment);
  if (!item || item.amount !== WELCOME_PAYMENT.amount || item.memo !== WELCOME_PAYMENT.memo) {
    throw httpError(400, "This payment is not a SARAVIA Testnet welcome payment");
  }
  return item;
}

async function getBlobStore() {
  const blobs = await import("@netlify/blobs");
  return blobs.getStore({ name: "saravia-testnet", consistency: "strong" });
}

function keyForUid(uid) {
  const crypto = require("node:crypto");
  return crypto.createHash("sha256").update(uid).digest("hex");
}

async function readJson(store, key) {
  return store.get(key, { type: "json" });
}

async function writeJson(store, key, value) {
  await store.setJSON(key, value);
}

async function getPiClient() {
  requireTestnetEnv(true);
  const module = await import("pi-backend");
  const PiNetwork = module.default || module;
  return new PiNetwork(process.env.PI_API_KEY, process.env.PI_APP_WALLET_PRIVATE_SEED);
}

module.exports = {
  PI_API_BASE, SUPPORT_PAYMENT, WELCOME_PAYMENT, bodyOf, getBlobStore, getPiClient,
  handleError, httpError, json, keyForUid, methodGuard, piFetch, readJson,
  requiredString, unwrapPayment, verifyAccessToken, writeJson, assertSupportPayment,
  assertWelcomePayment
};
