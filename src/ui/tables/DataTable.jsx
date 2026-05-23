import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Enterprise DataTable
 * - Sticky headers
 * - Row hover with full-width highlight
 * - Built-in empty state
 * - Skeleton loading
 * - Mobile-responsive
 */
export const DataTable = ({
    columns = [],
    data = [],
    isLoading = false,
    emptyStateMessage = 'لا توجد بيانات متاحة حالياً',
    emptyStateIcon: EmptyIcon = null,
    className = '',
    onRowClick,
    rowKey = 'id',
    skeletonRows = 6,
}) => {
    const [sortKey,  setSortKey]  = useState(null);
    const [sortDir,  setSortDir]  = useState('asc');

    const handleSort = (key) => {
        if (!key) return;
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortedData = React.useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = String(av).localeCompare(String(bv), 'ar');
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [data, sortKey, sortDir]);

    /* ─── Skeleton Loader ─── */
    if (isLoading) {
        return (
            <div className={`data-table-wrapper ${className}`}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: skeletonRows }).map((_, i) => (
                            <tr key={i}>
                                {columns.map(col => (
                                    <td key={col.key}>
                                        <div
                                            className="skeleton"
                                            style={{
                                                height: '14px',
                                                borderRadius: '6px',
                                                width: col.key === 'actions' ? '70px' : '100%',
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    /* ─── Empty State ─── */
    if (!isLoading && sortedData.length === 0) {
        return (
            <div className={`data-table-wrapper ${className}`}>
                <div style={{
                    padding: '3rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                }}>
                    {EmptyIcon ? (
                        <EmptyIcon style={{ width: 44, height: 44, color: 'var(--text-muted)', strokeWidth: 1.25 }} />
                    ) : (
                        <div style={{
                            width: 52,
                            height: 52,
                            borderRadius: 'var(--radius-xl)',
                            background: 'var(--bg-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                        }}>
                            📄
                        </div>
                    )}
                    <p style={{
                        fontSize: 'var(--text-body-sm)',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                    }}>
                        {emptyStateMessage}
                    </p>
                </div>
            </div>
        );
    }

    /* ─── Table ─── */
    return (
        <div className={`data-table-wrapper overflow-x-auto ${className}`}>
            <table className="data-table">
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th
                                key={col.key}
                                onClick={() => col.sortable !== false && col.key !== 'actions' && handleSort(col.key)}
                                style={{
                                    cursor: col.sortable !== false && col.key !== 'actions' ? 'pointer' : 'default',
                                    userSelect: 'none',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                    {col.label}
                                    {col.key !== 'actions' && sortKey === col.key && (
                                        sortDir === 'asc'
                                            ? <ChevronUp size={12} />
                                            : <ChevronDown size={12} />
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <AnimatePresence>
                        {sortedData.map((row, idx) => (
                            <motion.tr
                                key={row[rowKey] || idx}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.015 }}
                                onClick={() => onRowClick?.(row)}
                                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                            >
                                {columns.map(col => (
                                    <td key={col.key}>
                                        {col.render
                                            ? col.render(row[col.key], row)
                                            : row[col.key] ?? '—'
                                        }
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
