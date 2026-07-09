/**
 * Platform Settings
 * A tiny key/value store (single doc in tblSettings) that lets the superadmin
 * flip runtime behaviour — question shuffling, the Gemini model, feature flags —
 * without an .env change + redeploy.
 *
 * Reads are served from a short-lived in-memory cache so hot paths (e.g. the
 * per-request shuffle check) don't hit Mongo every time. Each setting falls back
 * to its .env value and then a hard-coded default, so the app behaves exactly as
 * before until an admin overrides something.
 */

import { getDB } from '../methods.js';

const SETTINGS_DOC_ID = 'platform';
const CACHE_TTL_MS = 15 * 1000;

/**
 * Registry of the settings we expose. `env` is the legacy environment variable
 * used as the fallback source of truth; `parse` coerces stored/env strings.
 */
export const SETTINGS_SCHEMA = {
    enable_shuffle: {
        type: 'boolean',
        env: 'ENABLE_SHUFFLE',
        default: false,
        label: 'Shuffle weekly test questions',
        description: 'Randomises question and option order per student to deter copying during weekly aptitude tests.',
    },
    gemini_model: {
        type: 'string',
        env: 'GEMINI_MODEL',
        default: 'gemini-2.5-flash',
        label: 'Gemini model',
        description: 'Which Google Gemini model powers AI features (code review, hints, tutor). Takes effect immediately.',
        options: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.1-flash-lite', 'gemini-2.0-flash'],
    },
    ai_features_enabled: {
        type: 'boolean',
        env: 'AI_FEATURES_ENABLED',
        default: true,
        label: 'AI features master switch',
        description: 'Global kill-switch for all AI features. Turn off to immediately stop Gemini spend if costs spike.',
    },
};

let cache = null;
let cachedAt = 0;

function coerce(type, raw) {
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (type === 'boolean') {
        if (typeof raw === 'boolean') return raw;
        return String(raw).toLowerCase() === 'true';
    }
    return String(raw);
}

/** Resolve one key: stored value → env → default (with type coercion). */
function resolve(key, stored) {
    const def = SETTINGS_SCHEMA[key];
    if (!def) return undefined;
    const fromStore = coerce(def.type, stored?.[key]);
    if (fromStore !== undefined) return fromStore;
    const fromEnv = coerce(def.type, process.env[def.env]);
    if (fromEnv !== undefined) return fromEnv;
    return def.default;
}

/** Load the raw stored doc (cached). Returns {} if none/unavailable. */
async function loadStored(force = false) {
    if (!force && cache && Date.now() - cachedAt < CACHE_TTL_MS) return cache;
    try {
        const db = getDB();
        const doc = await db.collection('tblSettings').findOne({ _id: SETTINGS_DOC_ID });
        cache = doc?.values || {};
    } catch {
        // DB not ready / error → behave as if nothing is overridden (env/defaults)
        cache = cache || {};
    }
    cachedAt = Date.now();
    return cache;
}

/** Get a single resolved setting value. */
export async function getSetting(key) {
    const stored = await loadStored();
    return resolve(key, stored);
}

/** Get every resolved setting as a flat map { key: value }. */
export async function getAllSettings() {
    const stored = await loadStored();
    const out = {};
    for (const key of Object.keys(SETTINGS_SCHEMA)) out[key] = resolve(key, stored);
    return out;
}

/**
 * Persist a partial set of overrides (validated against the schema) and refresh
 * the cache. Returns the full resolved settings map.
 */
export async function updateSettings(partial) {
    const db = getDB();
    const clean = {};
    for (const [key, val] of Object.entries(partial || {})) {
        const def = SETTINGS_SCHEMA[key];
        if (!def) continue; // ignore unknown keys
        const coerced = coerce(def.type, val);
        if (coerced === undefined) continue;
        if (def.options && def.type === 'string' && !def.options.includes(coerced)) continue; // reject bad enum
        clean[`values.${key}`] = coerced;
    }
    if (Object.keys(clean).length > 0) {
        await db.collection('tblSettings').updateOne(
            { _id: SETTINGS_DOC_ID },
            { $set: { ...clean, updated_at: new Date().toISOString() } },
            { upsert: true }
        );
    }
    await loadStored(true); // refresh cache immediately
    return getAllSettings();
}

/** Force-invalidate the cache (used after external writes). */
export function invalidateSettingsCache() {
    cache = null;
    cachedAt = 0;
}
