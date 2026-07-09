import { SETTINGS_SCHEMA, getAllSettings, updateSettings } from '../../utils/settings.js';
import aiService from '../../services/aiService.js';

/**
 * Platform Settings (superadmin)
 * Read and update the runtime settings that used to require an .env change.
 */
class SettingsController {

    /** POST /superadmin/settings/get — schema + current resolved values */
    async get(req, res, next) {
        try {
            const values = await getAllSettings();
            // Expose the schema (labels, types, options) so the UI can render generically
            const schema = Object.entries(SETTINGS_SCHEMA).map(([key, def]) => ({
                key,
                type: def.type,
                label: def.label,
                description: def.description,
                options: def.options || null,
                default: def.default,
            }));
            res.locals.responseData = {
                success: true, status: 200,
                message: 'Settings fetched',
                data: { schema, values }
            };
            next();
        } catch (error) {
            console.error('[Settings] get error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to fetch settings', error: error.message };
            next();
        }
    }

    /** POST /superadmin/settings/update — { values: { key: value, ... } } */
    async update(req, res, next) {
        try {
            const { values } = req.body || {};
            if (!values || typeof values !== 'object') {
                res.locals.responseData = { success: false, status: 400, message: 'values object is required', error: 'Invalid parameters' };
                return next();
            }

            const resolved = await updateSettings(values);

            // Apply the Gemini model change to the live AI service immediately so it
            // takes effect without a redeploy (the model is otherwise built at boot).
            if (values.gemini_model && typeof aiService.reloadModel === 'function') {
                aiService.reloadModel(resolved.gemini_model);
            }

            res.locals.responseData = {
                success: true, status: 200,
                message: 'Settings updated',
                data: { values: resolved }
            };
            next();
        } catch (error) {
            console.error('[Settings] update error:', error);
            res.locals.responseData = { success: false, status: 500, message: 'Failed to update settings', error: error.message };
            next();
        }
    }
}

export default new SettingsController();
