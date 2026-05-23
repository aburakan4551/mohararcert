/**
 * 🔒 AuthContext.jsx
 * Enterprise Security and Session Manager for mohararcert.
 * Tracks user sessions, Role-Based Access Controls, and real-time system settings.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, settingService, notificationService, auditService } from '../services/db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [settings, setSettings] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    // Load active session and settings
    const loadSession = useCallback(async () => {
        try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser);
            
            const activeSettings = await settingService.get();
            setSettings(activeSettings);

            if (currentUser) {
                const list = await notificationService.getByUserId(currentUser.id);
                setNotifications(list);
            }
        } catch (e) {
            console.error('Failed to load session details: ', e);
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
        try {
            const loggedInUser = await authService.login(email, password);
            setUser(loggedInUser);
            // Fetch their notifications
            const list = await notificationService.getByUserId(loggedInUser.id);
            setNotifications(list);
            return loggedInUser;
        } catch (e) {
            throw e;
        } finally {
            setLoading(false);
        }
    };

    // Handle session termination
    const logout = async () => {
        setLoading(true);
        try {
            await authService.logout();
            setUser(null);
            setNotifications([]);
        } catch (e) {
            console.error('Logout error: ', e);
        } finally {
            setLoading(false);
        }
    };

    // Refetch Settings dynamically when modified
    const refreshSettings = async () => {
        try {
            const activeSettings = await settingService.get();
            setSettings(activeSettings);
        } catch (e) {
            console.error(e);
        }
    };

    // Refetch Notifications
    const refreshNotifications = async () => {
        if (!user) return;
        try {
            const list = await notificationService.getByUserId(user.id);
            setNotifications(list);
        } catch (e) {
            console.error(e);
        }
    };

    // Clear Notification
    const readNotification = async (id) => {
        try {
            await notificationService.markAsRead(id);
            await refreshNotifications();
        } catch (e) {
            console.error(e);
        }
    };

    // Clear All Notifications
    const clearAllNotifications = async () => {
        if (!user) return;
        try {
            await notificationService.markAllAsRead(user.id);
            await refreshNotifications();
        } catch (e) {
            console.error(e);
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
