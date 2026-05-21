/**
 * 👥 UsersManagement.jsx
 * Administrator's Identity & Access Controller (RBAC Management) for mohararcert.
 * Tracks system operators, provides dropdown updates, and registers modifications in security logs.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService, auditService } from '../services/db';
import { Shield, Users, Mail, UserCheck, ShieldAlert, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UsersManagement() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const list = await authService.getUsers();
            setUsersList(list);
        } catch (e) {
            console.error('Failed to load users database: ', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            alert('صلاحية الوصول غير كافية لمشاهدة شاشة إدارة الهوية والمستخدمين.');
            navigate('/');
            return;
        }
        loadUsers();
    }, [user, navigate]);

    const handleRoleChange = async (userId, newRole) => {
        setUpdatingId(userId);
        try {
            const targetUser = usersList.find(u => u.id === userId);
            await authService.updateUserRole(userId, newRole);
            await auditService.log(
                'UPDATE_USER_ROLE', 
                user, 
                `تعديل صلاحية المستخدم: ${targetUser.name} من (${targetUser.role}) إلى (${newRole})`
            );
            
            // Reload user records
            await loadUsers();
            alert('تم تحديث صلاحية المستخدم بنجاح في مصفوفة الأدوار!');
        } catch (e) {
            alert('فشل تحديث الصلاحية: ' + e.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const getRoleDetails = (role) => {
        switch (role) {
            case 'CREATOR':
                return { badge: 'bg-blue-500/10 text-blue-500 border border-blue-500/10', title: 'منشئ المعاملات' };
            case 'ASSISTANT_MANAGER':
                return { badge: 'bg-purple-500/10 text-purple-500 border border-purple-500/10', title: 'مساعد المدير العام بالتخطيط' };
            case 'GENERAL_MANAGER':
                return { badge: 'bg-amber-500/10 text-amber-500 border border-amber-500/10', title: 'المدير العام' };
            case 'SUPER_ADMIN':
                return { badge: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10', title: 'مدير النظام الفيدرالي' };
            default:
                return { badge: 'bg-slate-100 text-slate-500', title: 'عضو عام' };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500" />
                        إدارة المستخدمين وصلاحيات الـ RBAC
                    </h2>
                    <p className="text-xs text-slate-400">إسناد الأدوار، تعديل الصلاحيات الوظيفية، وعزل الأذونات الأمنية للمشغلين.</p>
                </div>
            </div>

            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {usersList.map((usr) => {
                    const roleMeta = getRoleDetails(usr.role);
                    const isSelf = usr.id === user.id;

                    return (
                        <div key={usr.id} className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4 hover:shadow-md transition-all duration-300 relative overflow-hidden">
                            {/* Decorative badge background element */}
                            <div className="absolute top-[-10px] left-[-10px] w-12 h-12 bg-slate-500/5 rounded-full blur-md pointer-events-none" />

                            <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
                                {usr.role === 'SUPER_ADMIN' ? <Shield className="w-6 h-6 text-emerald-500" /> : <Award className="w-6 h-6" />}
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{usr.name}</h3>
                                    {isSelf && (
                                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold">أنت</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono font-medium">
                                    <Mail className="w-3.5 h-3.5" />
                                    <span className="truncate">{usr.email}</span>
                                </div>

                                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/40">
                                    <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full inline-block ${roleMeta.badge}`}>
                                        {roleMeta.title}
                                    </span>

                                    {!isSelf ? (
                                        <div className="relative">
                                            <select
                                                value={usr.role}
                                                disabled={updatingId === usr.id}
                                                onChange={e => handleRoleChange(usr.id, e.target.value)}
                                                className="pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black outline-none text-slate-700 dark:text-slate-200 cursor-pointer w-44"
                                            >
                                                <option value="CREATOR">منشئ المعاملات</option>
                                                <option value="ASSISTANT_MANAGER">مساعد المدير العام بالتخطيط</option>
                                                <option value="GENERAL_MANAGER">المدير العام</option>
                                                <option value="SUPER_ADMIN">مدير النظام الفيدرالي</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-400 italic">لا يمكن تعديل حسابك الشخصي</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
