/**
 * 🔒 AuthContext.jsx
 * Enterprise Security and Session Manager for mohararcert.
 * Tracks user sessions, Role-Based Access Controls, and real-time system settings.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, settingService, notificationService, auditService } from '../services/db';
import { logger } from '../utils/debug';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Load active session and settings
    const loadSession = useCallback(async () => {
        logger.system('بدء استرجاع جلسة المستخدم النشطة...');
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            
            const activeSettings = await settingService.get();
            setSettings(activeSettings);

            if (currentUser) {
                logger.auth(`تمت استعادة جلسة المستخدم بنجاح: ${currentUser.name} (${currentUser.role})`);
                const list = await notificationService.getByUserId(currentUser.id);
                setNotifications(list);
            } else {
                logger.auth('لا توجد جلسة مستخدم نشطة حالياً في التخزين.');
            }
        } catch (e) {
            logger.error('فشل استرداد تفاصيل الجلسة النشطة للنظام', e);
        } finally {
            setInitializing(false);
        }
    }, []);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    // Handle user authentication
    const login = async (email, password) => {
        setLoading(true);
        logger.auth(`محاولة تسجيل دخول للمستخدم: ${email}`);
        try {
            const loggedInUser = await authService.login(email, password);
            setUser(loggedInUser);
            logger.auth(`تم تسجيل الدخول بنجاح للمستخدم: ${loggedInUser.name} (${loggedInUser.role})`);
            
            // Fetch their notifications
            const list = await notificationService.getByUserId(loggedInUser.id);
            setNotifications(list);
            return loggedInUser;
        } catch (e) {
            logger.error(`فشل تسجيل الدخول للبريد: ${email}`, e);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    // Handle session termination
    const logout = async () => {
        setLoading(true);
        const email = user?.email;
        logger.auth(`بدء تسجيل خروج المستخدم: ${email || 'غير معروف'}`);
        try {
            await authService.logout();
            setUser(null);
            setNotifications([]);
            logger.auth(`تم تسجيل الخروج بنجاح للمستخدم: ${email}`);
        } catch (e) {
            logger.error('حدث خطأ أثناء محاولة تسجيل الخروج', e);
        } finally {
            setLoading(false);
        }
    };

    // Refetch Settings dynamically when modified
    const refreshSettings = async () => {
        try {
            const activeSettings = await settingService.get();
            setSettings(activeSettings);
            logger.system('تم تحديث إعدادات النظام الحيوية بنجاح.');
        } catch (e) {
            logger.error('فشل تحديث إعدادات النظام الحيوية', e);
        }
    };

    // Refetch Notifications
    const refreshNotifications = async () => {
        if (!user) return;
        try {
            const list = await notificationService.getByUserId(user.id);
            setNotifications(list);
            logger.system(`تمت إعادة تحميل الإشعارات للمستخدم: ${user.name}`);
        } catch (e) {
            logger.error('فشل إعادة تحميل قائمة الإشعارات', e);
        }
    };

    // Clear Notification
    const readNotification = async (id) => {
        try {
            await notificationService.markAsRead(id);
            logger.system(`تم تحديد الإشعار كقروء: ${id}`);
            await refreshNotifications();
        } catch (e) {
            logger.error(`فشل تعديل حالة الإشعار ${id} إلى مقروء`, e);
        }
    };

    // Clear All Notifications
    const clearAllNotifications = async () => {
        if (!user) return;
        try {
            await notificationService.markAllAsRead(user.id);
            logger.system(`تم مسح جميع إشعارات المستخدم: ${user.name}`);
            await refreshNotifications();
        } catch (e) {
            logger.error('فشل مسح كافة الإشعارات', e);
        }
    };

    // Role-based authorization gate helper
    const hasRole = useCallback((allowedRoles = []) => {
        if (!user) return false;
        return allowedRoles.includes(user.role);
    }, [user]);

    // Check RBAC Permissive Matrix
    const canPerform = useCallback((permission) => {
        if (!user || !settings?.rbacSettings) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        const perms = settings.rbacSettings[user.role] || [];
        return perms.includes(permission) || perms.includes('*');
    }, [user, settings]);

    const value = {
        user,
        settings,
        notifications,
        loading,
        login,
        logout,
        hasRole,
        canPerform,
        refreshSettings,
        refreshNotifications,
        readNotification,
        clearAllNotifications
    };

    return (
        <AuthContext.Provider value={value}>
            {!initializing && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
