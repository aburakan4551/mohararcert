/**
 * 🔀 db.js
 * Unified Services Abstraction Layer (Repository Coordinator).
 * Standardized imports for the entire mohararcert application, isolating all components
 * from specific storage mechanisms and enabling seamless backend swap.
 */

import { localProvider } from './providers/local.provider';
import { firebaseProvider } from './providers/firebase.provider';
import { supabaseProvider } from './providers/supabase.provider';

// ⚙️ Provider Configuration
// Swapping this string changes the entire database, authentication, and notification engine.
const ACTIVE_PROVIDER = 'local'; // Options: 'local' | 'firebase' | 'supabase'

const providers = {
    local: localProvider,
    firebase: firebaseProvider,
    supabase: supabaseProvider
};

const provider = providers[ACTIVE_PROVIDER];

if (!provider) {
    throw new Error(`Provider "${ACTIVE_PROVIDER}" is not registered in mohararcert services coordinator.`);
}

// 📦 Core Data Service (Certificates)
export const dbService = {
    getAll: () => provider.certificates.getAll(),
    getById: (id) => provider.certificates.getById(id),
    create: (cert) => provider.certificates.create(cert),
    update: (id, cert) => provider.certificates.update(id, cert),
    delete: (id) => provider.certificates.delete(id),
    
    // Core Workflow state triggers
    submitForApproval: async (id, user) => {
        return provider.certificates.transitionWorkflow(id, 'PENDING_APPROVAL', user, 'تم الرفع للمراجعة والاعتماد');
    },
    
    approveByAssistant: async (id, user, comments) => {
        return provider.certificates.transitionWorkflow(id, 'APPROVED_BY_ASSISTANT', user, comments || 'تمت المراجعة والتأشير بالقبول');
    },
    
    approveFinal: async (id, user, comments) => {
        return provider.certificates.transitionWorkflow(id, 'FINAL_APPROVED', user, comments || 'تم الاعتماد النهائي والمصادقة');
    },
    
    reject: async (id, user, comments) => {
        return provider.certificates.transitionWorkflow(id, 'REJECTED', user, comments || 'تم الرفض');
    },
    
    returnForEdit: async (id, user, comments) => {
        return provider.certificates.transitionWorkflow(id, 'RETURNED_FOR_EDIT', user, comments || 'تمت الإعادة للتعديل مع الملاحظات');
    },

    archive: async (id, user) => {
        return provider.certificates.transitionWorkflow(id, 'ARCHIVED', user, 'تم ترحيل المعاملة للأرشيف النهائي');
    }
};

// 🎨 Templates Manager Service
export const templateService = {
    getAll: () => provider.templates.getAll(),
    getById: (id) => provider.templates.getById(id),
    create: (template) => provider.templates.create(template),
    update: (id, template) => provider.templates.update(id, template),
    delete: (id) => provider.templates.delete(id)
};

// ⚙️ Organization Settings Service
export const settingService = {
    get: () => provider.settings.get(),
    update: (settings) => provider.settings.update(settings)
};

// 🔐 Authentication & Session Service (RBAC Enabled)
export const authService = {
    login: async (email, password) => {
        const user = await provider.auth.login(email, password);
        // Log the authentication event
        await provider.audit.log('LOGIN', user, `سجل الدخول بنجاح بدور: ${user.role}`);
        return user;
    },
    
    logout: async () => {
        const currentUser = await provider.auth.getCurrentUser();
        if (currentUser) {
            await provider.audit.log('LOGOUT', currentUser, 'سجل خروجه من النظام');
        }
        await provider.auth.logout();
        return true;
    },
    
    getCurrentUser: () => provider.auth.getCurrentUser(),
    getUsers: () => provider.auth.getUsers(),
    updateUserRole: (userId, newRole) => provider.auth.updateUserRole(userId, newRole)
};

// 🛡️ Security Audit Logs Service
export const auditService = {
    getAll: () => provider.audit.getAll(),
    log: (action, user, details, targetId) => provider.audit.log(action, user, details, targetId)
};

// 🔔 In-App Realtime Notifications Service
export const notificationService = {
    getByUserId: (userId) => provider.notifications.getByUserId(userId),
    create: (notification) => provider.notifications.create(notification),
    markAsRead: (id) => provider.notifications.markAsRead(id),
    markAllAsRead: (userId) => provider.notifications.markAllAsRead(userId)
};
