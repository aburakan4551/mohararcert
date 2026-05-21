/**
 * 📊 local.provider.js
 * High-fidelity Offline Database Provider for mohararcert.
 * Uses a robust dual IndexedDB / localStorage persistence mechanism.
 */

// Seeding standard assets and presets
import { CERTIFICATE_SCREENSHOT_PRESET_SETTINGS } from '../../config/certificatePreset';

const MOCK_USERS = [
    { id: 'usr-1', email: 'creator@platform.gov.sa', role: 'CREATOR', name: 'سليمان الحربي' },
    { id: 'usr-2', email: 'assistant@platform.gov.sa', role: 'ASSISTANT_MANAGER', name: 'مساعد المدير العام للتخطيط' },
    { id: 'usr-3', email: 'manager@platform.gov.sa', role: 'GENERAL_MANAGER', name: 'د. خالد السديري' },
    { id: 'usr-4', email: 'admin@platform.gov.sa', role: 'SUPER_ADMIN', name: 'عبد العزيز الرويلي' }
];

const DEFAULT_SETTINGS = {
    ...CERTIFICATE_SCREENSHOT_PRESET_SETTINGS,
    orgName: 'وزارة التخطيط والتطوير',
    orgSubName: 'الإدارة العامة للتميز المؤسسي',
    directorName: 'د. خالد السديري',
    directorTitle: 'المدير العام للمنصة',
    visaLabel: 'مساعد المدير العام للتخطيط',
    visaName: 'أ. أحمد الغامدي',
    stampOpacity: 0.85,
    stampSize: 125,
    stampRotation: -8,
    // Add default system permissions configuration
    rbacSettings: {
        CREATOR: ['CREATE_CERTIFICATE', 'EDIT_DRAFT', 'VIEW_MY_CERTIFICATES', 'EXPORT_PREVIEW'],
        ASSISTANT_MANAGER: ['VIEW_PENDING', 'APPROVE_VISA', 'REJECT_VISA', 'RETURN_VISA'],
        GENERAL_MANAGER: ['VIEW_PENDING', 'APPROVE_FINAL', 'REJECT_FINAL', 'BULK_APPROVE'],
        SUPER_ADMIN: ['*']
    }
};

// Seeding Default Official Templates
const SEED_TEMPLATES = [
    {
        id: 'tpl-1',
        name: 'شهادة شكر وتقدير الفرع',
        image: '/قالب شهادة_page-0001.jpg',
        isDefault: true,
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: 'usr-4'
    }
];

// Seeding Default Certificates for testing out of the box
const SEED_CERTIFICATES = [
    {
        id: 'cert-101',
        recipientName: 'محمد بن عبد الله العتيبي',
        event: 'دورة الأمن السيبراني المتقدمة للقيادات',
        date: '14 ذو القعدة 1447هـ',
        serial: '202600001',
        status: 'DRAFT',
        createdBy: 'usr-1',
        creatorName: 'سليمان الحربي',
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        comments: '',
        workflowHistory: [
            { stage: 'DRAFT', timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), user: 'سليمان الحربي' }
        ],
        showQR: true
    },
    {
        id: 'cert-102',
        recipientName: 'المهندس ياسر بن سلمان المطيري',
        event: 'مبادرة التحول الرقمي وحوكمة البيانات المؤسسية',
        date: '12 شوال 1447هـ',
        serial: '202600002',
        status: 'PENDING_APPROVAL',
        createdBy: 'usr-1',
        creatorName: 'سليمان الحربي',
        createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        comments: '',
        workflowHistory: [
            { stage: 'DRAFT', timestamp: new Date(Date.now() - 36 * 3600000).toISOString(), user: 'سليمان الحربي' },
            { stage: 'PENDING_APPROVAL', timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), user: 'سليمان الحربي' }
        ],
        showQR: true
    },
    {
        id: 'cert-103',
        recipientName: 'أروى بنت عبد العزيز المقرن',
        event: 'ملتقى الابتكار الحكومي ورؤية المملكة 2030',
        date: '8 رمضان 1447هـ',
        serial: '202600003',
        status: 'APPROVED_BY_ASSISTANT',
        createdBy: 'usr-1',
        creatorName: 'سليمان الحربي',
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 3600000).toISOString(),
        comments: 'تم مراجعة الطلب والموافقة عليه والتأكد من مطابقة المعايير.',
        workflowHistory: [
            { stage: 'DRAFT', timestamp: new Date(Date.now() - 20 * 3600000).toISOString(), user: 'سليمان الحربي' },
            { stage: 'PENDING_APPROVAL', timestamp: new Date(Date.now() - 15 * 3600000).toISOString(), user: 'سليمان الحربي' },
            { stage: 'APPROVED_BY_ASSISTANT', timestamp: new Date(Date.now() - 10 * 3600000).toISOString(), user: 'مساعد المدير العام للتخطيط', comments: 'تم مراجعة الطلب والموافقة عليه والتأكد من مطابقة المعايير.' }
        ],
        showQR: true
    }
];

class LocalDatabase {
    constructor() {
        this.prefix = 'mohararcert_db_';
        this.initStorage();
    }

    initStorage() {
        try {
            if (!localStorage.getItem(this.prefix + 'users')) {
                localStorage.setItem(this.prefix + 'users', JSON.stringify(MOCK_USERS));
            }
            if (!localStorage.getItem(this.prefix + 'settings')) {
                localStorage.setItem(this.prefix + 'settings', JSON.stringify(DEFAULT_SETTINGS));
            }
            if (!localStorage.getItem(this.prefix + 'templates')) {
                localStorage.setItem(this.prefix + 'templates', JSON.stringify(SEED_TEMPLATES));
            }
            if (!localStorage.getItem(this.prefix + 'certificates')) {
                localStorage.setItem(this.prefix + 'certificates', JSON.stringify(SEED_CERTIFICATES));
            }
            if (!localStorage.getItem(this.prefix + 'audit_logs')) {
                const initLogs = [
                    {
                        id: 'log-1',
                        action: 'LOGIN',
                        userEmail: 'admin@platform.gov.sa',
                        userName: 'عبد العزيز الرويلي',
                        userRole: 'SUPER_ADMIN',
                        timestamp: new Date(Date.now() - 49 * 3600000).toISOString(),
                        details: 'تسجيل دخول ناجح إلى النظام'
                    }
                ];
                localStorage.setItem(this.prefix + 'audit_logs', JSON.stringify(initLogs));
            }
            if (!localStorage.getItem(this.prefix + 'notifications')) {
                const initNotifs = [
                    {
                        id: 'notif-1',
                        userId: 'usr-2', // Assistant
                        message: 'شهادة جديدة بانتظار المراجعة والاعتماد: محمد بن عبد الله العتيبي',
                        type: 'PENDING',
                        isRead: false,
                        createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
                    }
                ];
                localStorage.setItem(this.prefix + 'notifications', JSON.stringify(initNotifs));
            }
        } catch (e) {
            console.error('Failed to initialize local database storage: ', e);
        }
    }

    getItem(key) {
        try {
            return JSON.parse(localStorage.getItem(this.prefix + key)) || [];
        } catch (e) {
            return [];
        }
    }

    setItem(key, data) {
        try {
            localStorage.setItem(this.prefix + key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage quota exceeded or error occurred writing: ', key, e);
        }
    }
}

const db = new LocalDatabase();

export const localProvider = {
    // 🔐 AUTH OPERATIONS
    auth: {
        async login(email, password) {
            if (password !== 'Aa@0555386421') {
                throw new Error('كلمة المرور المدخلة غير صحيحة');
            }
            const users = db.getItem('users');
            const user = users.find(u => u.email === email);
            if (!user) {
                throw new Error('البريد الإلكتروني غير مسجل في المنصة');
            }
            // Save current session
            sessionStorage.setItem('current_user_session', JSON.stringify(user));
            return user;
        },

        async getCurrentUser() {
            try {
                const session = sessionStorage.getItem('current_user_session');
                return session ? JSON.parse(session) : null;
            } catch (e) {
                return null;
            }
        },

        async logout() {
            sessionStorage.removeItem('current_user_session');
            return true;
        },

        async getUsers() {
            return db.getItem('users');
        },

        async updateUserRole(userId, newRole) {
            const users = db.getItem('users');
            const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
            db.setItem('users', updated);
            return true;
        }
    },

    // 📋 CERTIFICATES OPERATIONS
    certificates: {
        async getAll() {
            return db.getItem('certificates');
        },

        async getById(id) {
            const certs = db.getItem('certificates');
            return certs.find(c => c.id === id) || null;
        },

        async create(certificate) {
            const certs = db.getItem('certificates');
            const newCert = {
                ...certificate,
                id: certificate.id || `cert-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            certs.unshift(newCert);
            db.setItem('certificates', certs);
            return newCert;
        },

        async update(id, certificate) {
            const certs = db.getItem('certificates');
            const idx = certs.findIndex(c => c.id === id);
            if (idx === -1) throw new Error('الشهادة المطلوبة غير موجودة');

            // Prevent updating if certificate status is locked (not DRAFT and not RETURNED_FOR_EDIT)
            const existing = certs[idx];
            if (existing.status !== 'DRAFT' && existing.status !== 'RETURNED_FOR_EDIT') {
                // If it is SUPER_ADMIN, allow updating, otherwise block
                const currentUser = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');
                if (currentUser.role !== 'SUPER_ADMIN') {
                    throw new Error('الشهادة في حالة اعتماد معلقة أو نهائية ومغلقة من التعديل');
                }
            }

            const updatedCert = {
                ...existing,
                ...certificate,
                updatedAt: new Date().toISOString()
            };
            certs[idx] = updatedCert;
            db.setItem('certificates', certs);
            return updatedCert;
        },

        async delete(id) {
            const certs = db.getItem('certificates');
            const filtered = certs.filter(c => c.id !== id);
            db.setItem('certificates', filtered);
            return true;
        },

        async transitionWorkflow(id, nextStage, user, comments = '') {
            const certs = db.getItem('certificates');
            const idx = certs.findIndex(c => c.id === id);
            if (idx === -1) throw new Error('الشهادة غير موجودة');

            const cert = certs[idx];
            const history = cert.workflowHistory || [];
            const newHistoryItem = {
                stage: nextStage,
                timestamp: new Date().toISOString(),
                user: user.name,
                comments: comments
            };

            const updatedCert = {
                ...cert,
                status: nextStage,
                comments: comments,
                workflowHistory: [...history, newHistoryItem],
                updatedAt: new Date().toISOString()
            };

            // Versioned Stamp & Signatures Retention
            // When GENERAL_APPROVED or FINAL_APPROVED, snap the currently configured settings permanently on the certificate object
            if (nextStage === 'APPROVED_BY_ASSISTANT') {
                const settings = db.getItem('settings');
                updatedCert.assistantSnapshot = {
                    visaName: settings.visaName || user.name,
                    visaLabel: settings.visaLabel || 'مساعد المدير العام للتخطيط',
                    visaSignature: settings.visaSignature,
                    approvedAt: new Date().toISOString()
                };
            }

            if (nextStage === 'FINAL_APPROVED') {
                const settings = db.getItem('settings');
                updatedCert.managerSnapshot = {
                    directorName: settings.directorName,
                    directorTitle: settings.directorTitle,
                    directorSignature: settings.directorSignature,
                    stamp: settings.stamp,
                    stampSize: settings.stampSize,
                    stampRotation: settings.stampRotation,
                    approvedAt: new Date().toISOString()
                };
            }

            certs[idx] = updatedCert;
            db.setItem('certificates', certs);
            return updatedCert;
        }
    },

    // 🎨 TEMPLATES OPERATIONS
    templates: {
        async getAll() {
            return db.getItem('templates');
        },

        async getById(id) {
            const templates = db.getItem('templates');
            return templates.find(t => t.id === id) || null;
        },

        async create(template) {
            const templates = db.getItem('templates');
            const newTpl = {
                ...template,
                id: template.id || `tpl-${Date.now()}`,
                version: 1,
                createdAt: new Date().toISOString()
            };
            templates.unshift(newTpl);
            db.setItem('templates', templates);
            return newTpl;
        },

        async update(id, template) {
            const templates = db.getItem('templates');
            const idx = templates.findIndex(t => t.id === id);
            if (idx === -1) throw new Error('القالب المطلوب غير موجود');

            const updatedTpl = {
                ...templates[idx],
                ...template,
                version: (templates[idx].version || 1) + 1,
                updatedAt: new Date().toISOString()
            };
            templates[idx] = updatedTpl;
            db.setItem('templates', templates);
            return updatedTpl;
        },

        async delete(id) {
            const templates = db.getItem('templates');
            const filtered = templates.filter(t => t.id !== id);
            db.setItem('templates', filtered);
            return true;
        }
    },

    // ⚙️ SETTINGS OPERATIONS
    settings: {
        async get() {
            // Guarantee retrieval from localStorage
            return JSON.parse(localStorage.getItem(db.prefix + 'settings')) || DEFAULT_SETTINGS;
        },

        async update(newSettings) {
            // Apply updates dynamically
            const current = await this.get();
            const merged = { ...current, ...newSettings };
            db.setItem('settings', merged);
            return merged;
        }
    },

    // 🔒 AUDIT LOG OPERATIONS
    audit: {
        async getAll() {
            return db.getItem('audit_logs');
        },

        async log(action, user, details = '', targetId = '') {
            const logs = db.getItem('audit_logs');
            const newLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                action,
                userEmail: user?.email || 'SYSTEM',
                userName: user?.name || 'النظام الذكي',
                userRole: user?.role || 'SYSTEM',
                timestamp: new Date().toISOString(),
                details,
                targetId
            };
            logs.unshift(newLog);
            db.setItem('audit_logs', logs);
            return newLog;
        }
    },

    // 🔔 NOTIFICATIONS OPERATIONS
    notifications: {
        async getByUserId(userId) {
            const notifs = db.getItem('notifications');
            return notifs.filter(n => n.userId === userId || n.userId === 'ALL');
        },

        async create(notification) {
            const notifs = db.getItem('notifications');
            const newNotif = {
                id: `notif-${Date.now()}`,
                isRead: false,
                createdAt: new Date().toISOString(),
                ...notification
            };
            notifs.unshift(newNotif);
            db.setItem('notifications', notifs);
            return newNotif;
        },

        async markAsRead(id) {
            const notifs = db.getItem('notifications');
            const updated = notifs.map(n => n.id === id ? { ...n, isRead: true } : n);
            db.setItem('notifications', updated);
            return true;
        },

        async markAllAsRead(userId) {
            const notifs = db.getItem('notifications');
            const updated = notifs.map(n => (n.userId === userId || n.userId === 'ALL') ? { ...n, isRead: true } : n);
            db.setItem('notifications', updated);
            return true;
        }
    }
};
