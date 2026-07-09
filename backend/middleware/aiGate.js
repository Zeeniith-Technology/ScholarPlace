import { getSetting } from '../utils/settings.js';

/**
 * AI kill-switch middleware.
 * Guards the endpoints that actually call Gemini so the superadmin can stop all
 * AI spend instantly from Platform Settings (ai_features_enabled). When disabled,
 * the request is short-circuited here with a clear message — it never reaches the
 * controller or Gemini.
 *
 * NOTE: like the auth guard, this MUST send its own response and NOT call next()
 * on the disabled path — the terminal responder runs after the controller, so
 * falling through would let the AI call happen anyway.
 */
export async function requireAIEnabled(req, res, next) {
    try {
        const enabled = await getSetting('ai_features_enabled');
        if (enabled === false) {
            return res.status(503).json({
                success: false,
                message: 'AI features are temporarily disabled by the administrator. Please try again later.',
                error: 'AI_DISABLED',
            });
        }
        return next();
    } catch (e) {
        // Fail OPEN: if the settings lookup errors we don't want to block a
        // working feature. The switch is an intentional off, not a default.
        console.warn('[aiGate] settings check failed, allowing request:', e.message);
        return next();
    }
}
