import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const DataTable = ({
    columns = [],
    data = [],
    isLoading = false,
    emptyStateMessage = 'لا توجد بيانات لعرضها حالياً',
    searchKey = '',
    searchPlaceholder = 'بحث...',
    onRowClick = null,
    className = '',
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter data based on search key
    const filteredData = React.useMemo(() => {
        if (!searchQuery || !searchKey) return data;
        return data.filter((row) => {
            const val = row[searchKey];
            if (!val) return false;
            return String(val).toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [data, searchQuery, searchKey]);

    return (
        <div className={`w-full flex flex-col gap-4 ${className}`}>
            {/* Search Input Bar if searchKey is provided */}
            {searchKey && (
                <div className="relative w-full max-w-sm">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-teal-500/10 rounded-xl px-4 py-2.5 pl-10 outline-none transition-all focus:ring-4"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Main Table Grid */}
            <div className="w-full overflow-hidden bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/40 rounded-2xl shadow-sm">
                <div className="w-full overflow-x-auto custom-scrollbar">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/40">
                                {columns.map((col, idx) => (
                                    <th
                                        key={col.key || idx}
                                        className={`px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider font-sans whitespace-nowrap ${
                                            col.sticky ? 'sticky left-0 bg-slate-50 dark:bg-slate-950 z-10' : ''
                                        }`}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/20">
                            {isLoading ? (
                                // Skeleton Loaders
                                Array.from({ length: 5 }).map((_, rIdx) => (
                                    <tr key={rIdx} className="animate-pulse">
                                        {columns.map((_, cIdx) => (
                                            <td key={cIdx} className="px-6 py-4">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredData.length === 0 ? (
                                // Empty state
                                <tr>
                                    <td colSpan={columns.length} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <svg className="w-8 h-8 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                                                {emptyStateMessage}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((row, rIdx) => (
                                    <motion.tr
                                        key={row.id || rIdx}
                                        onClick={() => onRowClick && onRowClick(row)}
                                        className={`group transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 ${
                                            onRowClick ? 'cursor-pointer' : ''
                                        }`}
                                        whileHover={{ x: onRowClick ? -2 : 0 }}
                                    >
                                        {columns.map((col, cIdx) => (
                                            <td
                                                key={col.key || cIdx}
                                                className={`px-6 py-4 text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap transition-colors group-hover:text-slate-950 dark:group-hover:text-white ${
                                                    col.sticky ? 'sticky left-0 bg-white dark:bg-slate-900 z-10' : ''
                                                }`}
                                            >
                                                {col.render ? col.render(row[col.key], row) : row[col.key]}
                                            </td>
                                        ))}
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
