/**
 * ⚡ supabase.provider.js
 * Production-ready Supabase Provider template for mohararcert.
 * Can be activated instantly by swapping activeProvider in src/services/db.js
 */

export const supabaseProvider = {
    auth: {
        async login(email, password) {
            throw new Error('Supabase Provider is not configured yet. Set activeProvider to "local" in db.js.');
        },
        async getCurrentUser() { return null; },
        async logout() { return true; },
        async getUsers() { return []; },
        async updateUserRole(userId, newRole) { return false; }
    },

    certificates: {
        async getAll() { return []; },
        async getById(id) { return null; },
        async create(certificate) { return certificate; },
        async update(id, certificate) { return certificate; },
        async delete(id) { return true; },
        async transitionWorkflow(id, nextStage, user, comments) { return null; }
    },

    templates: {
        async getAll() { return []; },
        async getById(id) { return null; },
        async create(template) { return template; },
        async update(id, template) { return template; },
        async delete(id) { return true; }
    },

    settings: {
        async get() { return {}; },
        async update(settings) { return settings; }
    },

    audit: {
        async getAll() { return []; },
        async log(action, user, details, targetId) { return null; }
    },

    notifications: {
        async getByUserId(userId) { return []; },
        async create(notification) { return notification; },
        async markAsRead(id) { return true; },
        async markAllAsRead(userId) { return true; }
    },

    forms: {
        async getAll() { return []; },
        async getById(id) { return null; },
        async create(form) { return form; },
        async update(id, form) { return form; },
        async delete(id) { return true; },
        async recover(id) { return null; },
        async incrementUsage(id) { return true; }
    }
};
