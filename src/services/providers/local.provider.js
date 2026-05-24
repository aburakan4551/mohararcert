/**
 * 📊 local.provider.js
 * High-fidelity Offline Database Provider for mohararcert.
 * Decoupled enterprise storage provider supporting full asset registries, version histories, and frozen snapshots.
 */

import { CERTIFICATE_SCREENSHOT_PRESET_SETTINGS } from '../../config/certificatePreset';

const MOCK_USERS = [
    { id: 'usr-1', email: 'creator@moh.gov.sa', role: 'CREATOR', name: 'سلمان الرويلي' },
    { id: 'usr-2', email: 'assistant@moh.gov.sa', role: 'ASSISTANT_MANAGER', name: 'مساعد المدير العام للتخطيط' },
    { id: 'usr-2b', email: 'aalanazi142@moh.gov.sa', role: 'ASSISTANT_MANAGER', name: 'مساعد المدير العام للتخطيط' },
    { id: 'usr-3', email: 'manager@moh.gov.sa', role: 'GENERAL_MANAGER', name: 'مدير فرع وزارة الصحة بالحدود الشمالية' },
    { id: 'usr-4', email: 'admin@moh.gov.sa', role: 'SUPER_ADMIN', name: 'يوسف العنزي' }
];

const DEFAULT_SETTINGS = {
    ...CERTIFICATE_SCREENSHOT_PRESET_SETTINGS,
    orgName: 'وزارة الصحة',
    orgSubName: 'فرع الوزارة بالحدود الشمالية',
    directorName: 'مدير فرع وزارة الصحة بالحدود الشمالية',
    directorTitle: 'مدير فرع وزارة الصحة بالحدود الشمالية',
    visaLabel: 'مساعد المدير العام للتخطيط',
    visaName: 'مساعد المدير العام للتخطيط',
    stampOpacity: 0.85,
    stampSize: 125,
    stampRotation: -8,
    rbacSettings: {
        CREATOR: ['CREATE_CERTIFICATE', 'EDIT_DRAFT', 'VIEW_MY_CERTIFICATES', 'EXPORT_PREVIEW'],
        ASSISTANT_MANAGER: ['VIEW_PENDING', 'APPROVE_VISA', 'REJECT_VISA', 'RETURN_VISA'],
        GENERAL_MANAGER: ['VIEW_PENDING', 'APPROVE_FINAL', 'REJECT_FINAL', 'BULK_APPROVE'],
        SUPER_ADMIN: ['*']
    }
};

const SEED_TEMPLATES = [
    {
        id: 'tpl-1',
        name: 'شهادة شكر وتقدير الفرع',
        image: '/قالب شهادة_page-0001.jpg',
        isDefault: true,
        version: 1,
        status: 'OFFICIAL', // OFFICIAL, DRAFT, REVIEW, ARCHIVED
        createdAt: new Date().toISOString(),
        createdBy: 'usr-4',
        fields: [],
        versionHistory: []
    }
];

const SEED_CERTIFICATES = [
    {
        id: 'cert-101',
        recipientName: 'محمد بن عبد الله العتيبي',
        event: 'دورة الأمن السيبراني المتقدمة للقيادات',
        date: '14 ذو القعدة 1447هـ',
        serial: '202600001',
        status: 'DRAFT',
        createdBy: 'usr-1',
        creatorName: 'سلمان الرويلي',
        createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
        comments: '',
        workflowHistory: [
            { stage: 'DRAFT', timestamp: new Date(Date.now() - 48 * 3600000).toISOString(), user: 'سلمان الرويلي' }
        ],
        showQR: true
    }
];

const SEED_GOVERNMENT_ASSETS = [
    {
        id: 'asset-1',
        name: 'الشعار الرسمي لوزارة الصحة السعودية',
        category: 'LOGOS', // LOGOS, SIGNATURES, STAMPS, FONTS
        url: '/logo_moh.png',
        department: 'التخطيط والتحول الرقمي',
        version: 1,
        uploadedBy: 'usr-4',
        createdAt: new Date().toISOString()
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
            if (!localStorage.getItem(this.prefix + 'government_assets')) {
                localStorage.setItem(this.prefix + 'government_assets', JSON.stringify(SEED_GOVERNMENT_ASSETS));
            }
            if (!localStorage.getItem(this.prefix + 'audit_logs')) {
                localStorage.setItem(this.prefix + 'audit_logs', JSON.stringify([]));
            }
            if (!localStorage.getItem(this.prefix + 'notifications')) {
                localStorage.setItem(this.prefix + 'notifications', JSON.stringify([]));
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
            console.error('Storage quota exceeded: ', key, e);
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

    // 📋 CERTIFICATES & WORKFLOW PERSISTENCE
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
            
            // Audit Log
            const currentUser = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');
            await localProvider.audit.log('CREATE_CERTIFICATE', currentUser, `إنشاء وثيقة جديدة برقم تسلسلي: ${newCert.serial}`, newCert.id);

            return newCert;
        },
        async update(id, certificate) {
            const certs = db.getItem('certificates');
            const idx = certs.findIndex(c => c.id === id);
            if (idx === -1) throw new Error('الشهادة المطلوبة غير موجودة');

            const existing = certs[idx];
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

            const settings = JSON.parse(localStorage.getItem(db.prefix + 'settings')) || DEFAULT_SETTINGS;

            // 🚨 Immutable Assistant Snapshot (Provisional Approval)
            if (nextStage === 'APPROVED_BY_ASSISTANT') {
                updatedCert.assistantSnapshot = {
                    visaName: settings.visaName || user.name,
                    visaLabel: settings.visaLabel || 'مساعد المدير العام للتخطيط',
                    visaSignature: settings.visaSignature,
                    approvedAt: new Date().toISOString()
                };
            }

            // 🚨 Complete Immutable Manager & Layout Snapshots (Final Approval Seal)
            if (nextStage === 'FINAL_APPROVED') {
                const templates = db.getItem('templates');
                const activeTpl = templates.find(t => t.id === cert.templateId) || null;

                updatedCert.managerSnapshot = {
                    directorName: settings.directorName,
                    directorTitle: settings.directorTitle,
                    directorSignature: settings.directorSignature,
                    stamp: settings.stamp,
                    stampSize: settings.stampSize,
                    stampRotation: settings.stampRotation,
                    approvedAt: new Date().toISOString()
                };

                // Frozen Bounding layout and dynamic elements capture (Self-contained Snapshot)
                if (activeTpl) {
                    updatedCert.frozenTemplate = JSON.parse(JSON.stringify(activeTpl)); // Immutable Snapshot
                }

                // Security Audit registration
                await localProvider.audit.log('SNAPSHOT_GENERATED', user, `تجميد وإصدار شهادة نهائية غير قابلة للتعديل برقم: ${cert.serial}`, id);
            }

            certs[idx] = updatedCert;
            db.setItem('certificates', certs);
            return updatedCert;
        }
    },

    // 🎨 TEMPLATES VERSIONING & LIFE-CYCLE
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
                status: 'DRAFT', // DRAFT, REVIEW, APPROVED, OFFICIAL, ARCHIVED
                versionHistory: [],
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

            const existing = templates[idx];
            const history = existing.versionHistory || [];

            // Add previous design state into changelog history stack
            const oldSnapshot = {
                version: existing.version || 1,
                fields: JSON.parse(JSON.stringify(existing.fields || [])),
                backgroundUrl: existing.backgroundUrl,
                updatedAt: existing.updatedAt || existing.createdAt,
                changelog: template.changelog || 'حفظ وتحديث الاستوديو التلقائي'
            };

            const updatedTpl = {
                ...existing,
                ...template,
                version: (existing.version || 1) + 1,
                updatedAt: new Date().toISOString(),
                versionHistory: [...history, oldSnapshot]
            };

            templates[idx] = updatedTpl;
            db.setItem('templates', templates);

            // Audit
            const currentUser = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');
            await localProvider.audit.log('TEMPLATE_PUBLISHED', currentUser, `حفظ نسخة إصدار جديد للقالب v${updatedTpl.version}`, id);

            return updatedTpl;
        },
        async delete(id) {
            const templates = db.getItem('templates');
            const filtered = templates.filter(t => t.id !== id);
            db.setItem('templates', filtered);
            return true;
        },
        async rollback(id, targetVersion) {
            const templates = db.getItem('templates');
            const idx = templates.findIndex(t => t.id === id);
            if (idx === -1) throw new Error('القالب غير موجود');

            const tpl = templates[idx];
            const history = tpl.versionHistory || [];
            const versionSnap = history.find(h => h.version === targetVersion);
            if (!versionSnap) throw new Error('الإصدار التاريخي المطلوب غير متوفر');

            // Retain current state as history snapshot before reverting
            const currentSnap = {
                version: tpl.version,
                fields: JSON.parse(JSON.stringify(tpl.fields || [])),
                backgroundUrl: tpl.backgroundUrl,
                updatedAt: tpl.updatedAt || tpl.createdAt,
                changelog: `تراجع تلقائي واستعادة للإصدار v${targetVersion}`
            };

            const restoredTpl = {
                ...tpl,
                fields: JSON.parse(JSON.stringify(versionSnap.fields)),
                backgroundUrl: versionSnap.backgroundUrl,
                version: (tpl.version || 1) + 1,
                updatedAt: new Date().toISOString(),
                versionHistory: [...history, currentSnap]
            };

            templates[idx] = restoredTpl;
            db.setItem('templates', templates);

            // Audit
            const currentUser = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');
            await localProvider.audit.log('VERSION_RESTORED', currentUser, `استعادة وإرجاع نسخة القالب للإصدار التاريخي v${targetVersion}`, id);

            return restoredTpl;
        }
    },

    // 🏛️ CENTRALIZED GOVERNMENT ASSETS REGISTRY
    assets: {
        async getAll() {
            return db.getItem('government_assets') || [];
        },
        async getById(id) {
            const assets = db.getItem('government_assets') || [];
            return assets.find(a => a.id === id) || null;
        },
        async create(asset) {
            const assets = db.getItem('government_assets') || [];
            const newAsset = {
                ...asset,
                id: `asset-${Date.now()}`,
                version: 1,
                createdAt: new Date().toISOString()
            };
            assets.unshift(newAsset);
            db.setItem('government_assets', assets);

            const currentUser = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');
            await localProvider.audit.log('ASSET_UPLOAD', currentUser, `رفع أصل حكومي جديد باسم: ${newAsset.name} ضمن فئة: ${newAsset.category}`, newAsset.id);

            return newAsset;
        },
        async update(id, changes) {
            const assets = db.getItem('government_assets') || [];
            const idx = assets.findIndex(a => a.id === id);
            if (idx === -1) throw new Error('الأصل الحكومي غير موجود');

            const existing = assets[idx];
            const updatedAsset = {
                ...existing,
                ...changes,
                version: (existing.version || 1) + 1,
                updatedAt: new Date().toISOString()
            };
            assets[idx] = updatedAsset;
            db.setItem('government_assets', assets);

            const currentUser = JSON.parse(sessionStorage.getItem('current_user_session') || '{}');
            await localProvider.audit.log('ASSET_REPLACE', currentUser, `استبدال وترقية نسخة الأصل الحكومي: ${existing.name} للإصدار v${updatedAsset.version}`, id);

            return updatedAsset;
        },
        async delete(id) {
            const assets = db.getItem('government_assets') || [];
            const filtered = assets.filter(a => a.id !== id);
            db.setItem('government_assets', filtered);
            return true;
        }
    },

    // ⚙️ SYSTEM SETTINGS
    settings: {
        async get() {
            return JSON.parse(localStorage.getItem(db.prefix + 'settings')) || DEFAULT_SETTINGS;
        },
        async update(newSettings) {
            const current = await this.get();
            const merged = { ...current, ...newSettings };
            db.setItem('settings', merged);
            return merged;
        }
    },

    // 🛡️ SECURITY AUDIT LOGS
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
                userName: user?.name || 'النظام المركزي للمحاضر والشهادات',
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

    // 🔔 REALTIME NOTIFICATIONS
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
