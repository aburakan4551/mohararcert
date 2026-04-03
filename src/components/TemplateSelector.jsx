import React, { useState, useMemo } from 'react'
import { useTemplates } from '../hooks/useTemplates'

/**
 * TemplateSelector – Allows users to browse, search and select a certificate template.
 * Each template is displayed as a card with a preview image.
 */
export default function TemplateSelector({ selectedId, onSelect }) {
    const { templates } = useTemplates()
    const [search, setSearch] = useState('')

    const filteredTemplates = useMemo(() => {
        if (!templates) return []
        return templates.filter(t => 
            t.name.toLowerCase().includes(search.toLowerCase())
        )
    }, [templates, search])

    if (!templates || templates.length === 0) {
        return (
            <div className="alert alert-warning">
                ⚠️ لم يتم العثور على أي قوالب. يرجى الذهاب إلى <strong>إعدادات التصميم</strong> لرفع قالب جديد أولاً.
            </div>
        )
    }

    return (
        <div className="template-selector-container">
            {/* Search and Filters */}
            <div className="template-filters">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input 
                        type="text" 
                        placeholder="ابحث عن قالب..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="template-count">
                    {filteredTemplates.length} قالب متاح
                </div>
            </div>

            {filteredTemplates.length === 0 ? (
                <div className="empty-search">
                    <div className="empty-icon">📂</div>
                    <p>لا توجد قوالب تطابق بحثك</p>
                    <button className="btn btn-sm btn-outline" onClick={() => setSearch('')}>مسح البحث</button>
                </div>
            ) : (
                <div className="template-grid">
                    {filteredTemplates.map(tpl => (
                        <div 
                            key={tpl.id} 
                            className={`template-card ${selectedId === tpl.id ? 'active' : ''}`}
                            onClick={() => onSelect(tpl.id)}
                        >
                            <div className="template-card-preview">
                                <img src={tpl.image} alt={tpl.name} />
                                {selectedId === tpl.id && (
                                    <div className="template-card-badge">✓ مختار</div>
                                )}
                            </div>
                            <div className="template-card-info">
                                <h4 className="template-card-name">
                                    {tpl.isDefault && <span title="قالب افتراضي">⭐ </span>}
                                    {tpl.name}
                                </h4>
                                <p className="template-card-meta">نظام الطبقات الموحد</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .template-selector-container {
                    margin-bottom: 24px;
                }
                .template-filters {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    gap: 16px;
                }
                .search-box {
                    position: relative;
                    flex: 1;
                    max-width: 400px;
                }
                .search-icon {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 0.9rem;
                    opacity: 0.5;
                }
                .search-input {
                    width: 100%;
                    padding: 10px 40px 10px 12px;
                    border: 1px solid var(--border, #ddd);
                    border-radius: 10px;
                    font-size: 0.9rem;
                    outline: none;
                    transition: border-color 0.3s;
                }
                .search-input:focus {
                    border-color: var(--gold, #c9a227);
                }
                .template-count {
                    font-size: 0.85rem;
                    color: var(--text-muted, #666);
                    font-weight: 600;
                }
                .template-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 16px;
                }
                .template-card {
                    background: var(--bg-card, #fff);
                    border: 2px solid var(--border, #eee);
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                .template-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--gold, #c9a22788);
                    box-shadow: 0 8px 16px rgba(0,0,0,0.06);
                }
                .template-card.active {
                    border-color: var(--gold, #c9a227);
                    box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.1);
                }
                .template-card-preview {
                    aspect-ratio: 1.414 / 1;
                    width: 100%;
                    overflow: hidden;
                    background: #f8f9fa;
                    position: relative;
                    border-bottom: 1px solid var(--border, #eee);
                }
                .template-card-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .template-card-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: var(--gold, #c9a227);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .template-card-info {
                    padding: 12px;
                }
                .template-card-name {
                    margin: 0;
                    font-size: 0.9rem;
                    font-weight: 700;
                    color: var(--text, #1a1a1a);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .template-card-meta {
                    margin: 4px 0 0;
                    font-size: 0.72rem;
                    color: var(--text-muted, #666);
                }
                .empty-search {
                    text-align: center;
                    padding: 40px;
                    background: var(--bg, #f9f9f9);
                    border-radius: 12px;
                    color: var(--text-muted, #666);
                }
                .empty-icon {
                    font-size: 2.5rem;
                    margin-bottom: 12px;
                    opacity: 0.3;
                }
            `}} />
        </div>
    )
}

