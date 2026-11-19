import React, { useState, useEffect, useMemo } from 'react';
import { sahityaApi } from '../api/services';
import { toast } from '../components/toast';

const DEFAULT_CATEGORIES = [
  'Aarti', 'Chalisa', 'Bhajan', 'Mantra', 'Stotra',
  'Shlok', 'Katha', 'Bhagavad Gita', 'Ramayan', 'Mahabharat',
  'Vedas', 'Upanishads', 'Puranas', 'Hindi Literature', 'Other'
];

export default function SahityaCMS() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'all' | 'add' | 'bulk' | 'categories'
  const [stats, setStats] = useState({
    totalContent: 0,
    publishedContent: 0,
    draftContent: 0,
    totalCategories: 15,
    freeContent: 0,
    premiumContent: 0,
  });
  const [contents, setContents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters for All Content
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAccess, setFilterAccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingContent, setEditingContent] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);

  // Form State
  const initialForm = {
    title: '',
    subtitle: '',
    category_id: 'chalisa',
    subcategory: '',
    language: 'Hindi',
    author: 'Traditional',
    deity: '',
    description: '',
    introduction: '',
    lyrics: '',
    meaning: '',
    translation: '',
    cover_image: '',
    tags: '',
    access_type: 'free',
    is_featured: false,
    display_order: 0,
    status: 'published',
    copyright_source: 'Traditional Vedic / Public Domain',
    copyright_owner: 'Traditional',
    license_type: 'Public Domain',
    commercial_reuse_allowed: true,
    attribution_text: '',
  };
  const [form, setForm] = useState(initialForm);

  // Bulk Import State
  const sampleJson = `[
  {
    "title": "श्री हनुमान चालीसा",
    "category": "Chalisa",
    "language": "Hindi",
    "author": "गोस्वामी तुलसीदास",
    "deity": "हनुमान जी",
    "description": "श्री हनुमान जी की पावन चालीसा",
    "lyrics": "॥ दोहा ॥\\nश्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि...\\n\\n॥ चौपाई ॥\\nजय हनुमान ज्ञान गुन सागर...",
    "meaning": "यहाँ हिंदी अर्थ पेस्ट करें",
    "coverImage": "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=400",
    "accessType": "free",
    "status": "published"
  },
  {
    "title": "श्री शिव चालीसा",
    "category": "Chalisa",
    "language": "Hindi",
    "author": "Traditional",
    "deity": "भगवान शिव",
    "description": "भगवान शिव की स्तुति",
    "lyrics": "जय गणेश गिरिजा सुवन, मंगल मूल सुजान...",
    "meaning": "यहाँ हिंदी अर्थ पेस्ट करें",
    "accessType": "free",
    "status": "published"
  }
]`;
  const [bulkInput, setBulkInput] = useState(sampleJson);
  const [bulkReport, setBulkReport] = useState(null);
  const [bulkValidating, setBulkValidating] = useState(false);
  const [selectedBulkIndices, setSelectedBulkIndices] = useState(new Set());

  // Category Modal State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, catRes] = await Promise.all([
        sahityaApi.stats().catch(() => ({ stats: {} })),
        sahityaApi.list().catch(() => ({ data: [] })),
        sahityaApi.categories().catch(() => ({ data: [] })),
      ]);
      if (sRes?.stats) setStats(sRes.stats);
      if (cRes?.data) setContents(cRes.data);
      if (catRes?.data) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to load Sahitya data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Content List
  const filteredContents = useMemo(() => {
    return contents.filter((c) => {
      const matchCat = !filterCat || c.category_id === filterCat || c.category === filterCat;
      const matchStatus = !filterStatus || c.status === filterStatus;
      const matchAccess = !filterAccess || c.access_type === filterAccess;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.author && c.author.toLowerCase().includes(q)) ||
        (c.deity && c.deity.toLowerCase().includes(q));
      return matchCat && matchStatus && matchAccess && matchQ;
    });
  }, [contents, filterCat, filterStatus, filterAccess, searchQuery]);

  // Form Submit (Create or Update)
  const handleSaveContent = async (e) => {
    e.preventDefault();
    if (!form.title || !form.lyrics) {
      toast('कृपया शीर्षक और संपूर्ण पाठ (Lyrics) दर्ज करें');
      return;
    }

    try {
      if (editingContent) {
        await sahityaApi.update(editingContent.id, form);
        toast(`"${form.title}" सफलतापूर्वक अद्यतन किया गया!`);
      } else {
        await sahityaApi.create(form);
        toast(`"${form.title}" सफलतापूर्वक प्रकाशित / सहेजा गया!`);
      }
      setEditingContent(null);
      setForm(initialForm);
      setActiveTab('all');
      fetchData();
    } catch (err) {
      toast('त्रुटि: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (item) => {
    setEditingContent(item);
    setForm({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
    });
    setActiveTab('add');
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`क्या आप "${title}" को निश्चित रूप से हटाना चाहते हैं?`)) return;
    try {
      await sahityaApi.delete(id);
      toast(`"${title}" हटा दिया गया।`);
      fetchData();
    } catch (err) {
      toast('हटाने में विफल: ' + err.message);
    }
  };

  const handleTogglePublish = async (item) => {
    try {
      if (item.status === 'published') {
        await sahityaApi.unpublish(item.id);
        toast(`"${item.title}" को ड्राफ्ट में बदला गया।`);
      } else {
        await sahityaApi.publish(item.id);
        toast(`"${item.title}" प्रकाशित कर दिया गया!`);
      }
      fetchData();
    } catch (err) {
      toast('त्रुटि: ' + err.message);
    }
  };

  // Bulk Import Preview & Execution
  const handleBulkPreview = async () => {
    setBulkValidating(true);
    try {
      const res = await sahityaApi.bulkImport({ json: bulkInput, preview: true });
      if (res?.report) {
        setBulkReport(res.report);
        const validIndices = new Set(
          res.report.items.filter((it) => it.isValid && !it.isDuplicate).map((it) => it.index)
        );
        setSelectedBulkIndices(validIndices);
        toast(`वैधीकरण पूर्ण: ${res.report.validCount} वैध, ${res.report.duplicateCount} डुप्लिकेट, ${res.report.invalidCount} अमान्य`);
      }
    } catch (err) {
      toast('JSON त्रुटि: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkValidating(false);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (!bulkReport || selectedBulkIndices.size === 0) {
      toast('कृपया आयात करने के लिए कम से कम एक वैध रिकॉर्ड चुनें।');
      return;
    }
    const selectedRecords = bulkReport.items
      .filter((it) => selectedBulkIndices.has(it.index))
      .map((it) => it.data);

    try {
      const res = await sahityaApi.bulkImport({ records: selectedRecords, preview: false });
      toast(res?.message || 'आयात सफलतापूर्वक संपन्न हुआ!');
      setBulkReport(null);
      fetchData();
      setActiveTab('all');
    } catch (err) {
      toast('आयात विफल: ' + err.message);
    }
  };

  // Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await sahityaApi.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        display_order: categories.length + 1,
      });
      toast(`श्रेणी "${newCatName}" जोड़ी गई!`);
      setNewCatName('');
      setNewCatDesc('');
      fetchData();
    } catch (err) {
      toast('श्रेणी जोड़ने में विफल: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* HEADER & TABS NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-main, #2E1308)' }}>
            📖 साहित्य संग्रह प्रबंधन (Reading-Only Library CMS)
          </h2>
          <div style={{ color: 'var(--text-muted, #7C6C5E)', fontSize: 13, marginTop: 4 }}>
            पवित्र वैदिक ग्रंथों, आरतियों, चालीसाओं एवं सनातन साहित्यों का शुद्ध पठन एवं नियंत्रण प्रणाली
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface-muted, #F5ECE1)', padding: 4, borderRadius: 10 }}>
          {[
            { id: 'dashboard', label: '📊 डैशबोर्ड', desc: 'Dashboard' },
            { id: 'all', label: '📚 समस्त साहित्य', desc: 'All Content' },
            { id: 'add', label: editingContent ? '✏️ संपादन' : '➕ नया साहित्य', desc: 'Add Content' },
            { id: 'bulk', label: '📥 बल्क आयात (JSON)', desc: 'Bulk Import' },
            { id: 'categories', label: '🏷️ श्रेणियाँ', desc: 'Categories' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                if (t.id === 'add' && !editingContent) setForm(initialForm);
                setActiveTab(t.id);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                background: activeTab === t.id ? '#790D13' : 'transparent',
                color: activeTab === t.id ? '#FFFFFF' : 'var(--text-main, #333)',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div>
          {/* STATS TILES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'कुल साहित्य (Total Content)', value: stats.totalContent || contents.length, color: '#790D13', icon: '📚' },
              { label: 'प्रकाशित साहित्य (Published)', value: stats.publishedContent || contents.filter(c => c.status === 'published').length, color: '#16A34A', icon: '✅' },
              { label: 'ड्राफ्ट साहित्य (Drafts)', value: stats.draftContent || contents.filter(c => c.status === 'draft').length, color: '#D97706', icon: '📝' },
              { label: 'कुल श्रेणियाँ (Categories)', value: categories.length || 15, color: '#2563EB', icon: '🏷️' },
              { label: 'निःशुल्क पठन (Free Content)', value: stats.freeContent || contents.filter(c => c.access_type === 'free').length, color: '#059669', icon: '📖' },
              { label: 'प्रीमियम ग्रंथ (Premium)', value: stats.premiumContent || contents.filter(c => c.access_type === 'premium').length, color: '#9333EA', icon: '👑' },
            ].map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--surface, #FFFFFF)',
                  padding: '18px 20px',
                  borderRadius: 14,
                  border: '1px solid var(--border, #EADBCE)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted, #7C6C5E)', fontWeight: 600 }}>{kpi.label}</span>
                  <span style={{ fontSize: 20 }}>{kpi.icon}</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: kpi.color, marginTop: 8 }}>
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          {/* QUICK SHORTCUTS & RECENT PREVIEWS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
            {/* RECENT CONTENT TABLE */}
            <div style={{ background: 'var(--surface, #FFFFFF)', padding: 20, borderRadius: 14, border: '1px solid var(--border, #EADBCE)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>हाल ही में जोड़े गए पावन साहित्य</h3>
                <button
                  onClick={() => setActiveTab('all')}
                  style={{ background: 'none', border: 'none', color: '#790D13', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
                >
                  सभी देखें →
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border, #F5ECE1)', textAlign: 'left', color: '#7C6C5E' }}>
                    <th style={{ padding: '8px 10px' }}>शीर्षक (Title)</th>
                    <th style={{ padding: '8px 10px' }}>श्रेणी (Category)</th>
                    <th style={{ padding: '8px 10px' }}>भाषा</th>
                    <th style={{ padding: '8px 10px' }}>एक्सेस</th>
                    <th style={{ padding: '8px 10px' }}>स्थिति</th>
                  </tr>
                </thead>
                <tbody>
                  {contents.slice(0, 8).map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border, #F5ECE1)' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--text-main, #2E1308)' }}>
                        {c.title}
                      </td>
                      <td style={{ padding: '10px 10px', textTransform: 'capitalize' }}>{c.category_id || c.category}</td>
                      <td style={{ padding: '10px 10px' }}>{c.language || 'Hindi'}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: c.access_type === 'premium' ? '#FEF3C7' : '#DCFCE7',
                          color: c.access_type === 'premium' ? '#92400E' : '#166534'
                        }}>
                          {c.access_type === 'premium' ? '👑 Premium' : 'Free'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: c.status === 'published' ? '#E0F2FE' : '#F3F4F6',
                          color: c.status === 'published' ? '#0369A1' : '#4B5563'
                        }}>
                          {c.status === 'published' ? 'प्रकाशित' : 'ड्राफ्ट'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* QUICK ACTIONS PANEL */}
            <div style={{ background: 'var(--surface, #FFFFFF)', padding: 20, borderRadius: 14, border: '1px solid var(--border, #EADBCE)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>त्वरित क्रियाएं (Quick Actions)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => { setForm(initialForm); setActiveTab('add'); }}
                  style={{
                    padding: '12px 16px', background: '#790D13', color: '#FFF', border: 'none',
                    borderRadius: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span>➕</span>
                  <div>
                    <div>नया साहित्य जोड़ें</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>आरती, चालीसा, स्तोत्र आदि</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('bulk')}
                  style={{
                    padding: '12px 16px', background: '#D97706', color: '#FFF', border: 'none',
                    borderRadius: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span>📥</span>
                  <div>
                    <div>बल्क आयात (Copy-Paste JSON)</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>सैकड़ों श्लोक व आरतियां एक साथ</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('categories')}
                  style={{
                    padding: '12px 16px', background: '#1E293B', color: '#FFF', border: 'none',
                    borderRadius: 10, fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <span>🏷️</span>
                  <div>
                    <div>श्रेणी प्रबंधन</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>15 सनातन श्रेणियां व्यवस्थित करें</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALL CONTENT */}
      {activeTab === 'all' && (
        <div style={{ background: 'var(--surface, #FFFFFF)', padding: 20, borderRadius: 14, border: '1px solid var(--border, #EADBCE)' }}>
          {/* SEARCH & FILTERS ROW */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="शीर्षक, देवता या लेखक खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB', minWidth: 260, fontSize: 13 }}
            />

            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            >
              <option value="">सभी श्रेणियां (All Categories)</option>
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c.toLowerCase()}>{c}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            >
              <option value="">सभी स्थितियां (All Status)</option>
              <option value="published">प्रकाशित (Published)</option>
              <option value="draft">ड्राफ्ट (Draft)</option>
            </select>

            <select
              value={filterAccess}
              onChange={(e) => setFilterAccess(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
            >
              <option value="">सभी एक्सेस (Free / Premium)</option>
              <option value="free">निःशुल्क (Free)</option>
              <option value="premium">प्रीमियम (Premium)</option>
            </select>

            <div style={{ marginLeft: 'auto', fontSize: 13, color: '#7C6C5E', fontWeight: 600 }}>
              कुल प्राप्त: {filteredContents.length}
            </div>
          </div>

          {/* TABLE */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #EADBCE', textAlign: 'left', background: '#FAF4E8', color: '#7C6C5E' }}>
                <th style={{ padding: '10px 12px' }}>कवर</th>
                <th style={{ padding: '10px 12px' }}>शीर्षक एवं उपशीर्षक</th>
                <th style={{ padding: '10px 12px' }}>श्रेणी</th>
                <th style={{ padding: '10px 12px' }}>देवता / लेखक</th>
                <th style={{ padding: '10px 12px' }}>भाषा</th>
                <th style={{ padding: '10px 12px' }}>एक्सेस</th>
                <th style={{ padding: '10px 12px' }}>स्थिति</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>क्रियाएं</th>
              </tr>
            </thead>
            <tbody>
              {filteredContents.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #F5ECE1' }}>
                  <td style={{ padding: '10px 12px' }}>
                    {c.cover_image ? (
                      <img src={c.cover_image} alt="" style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 36, height: 48, background: '#F5ECE1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📖</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 800, color: '#2E1308' }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: '#7C6C5E' }}>{c.subtitle || c.slug}</div>
                  </td>
                  <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{c.category_id || c.category}</td>
                  <td style={{ padding: '10px 12px' }}>{c.deity ? `${c.deity} • ` : ''}{c.author || 'Traditional'}</td>
                  <td style={{ padding: '10px 12px' }}>{c.language || 'Hindi'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: c.access_type === 'premium' ? '#FEF3C7' : '#DCFCE7',
                      color: c.access_type === 'premium' ? '#92400E' : '#166534'
                    }}>
                      {c.access_type === 'premium' ? '👑 Premium' : 'Free'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: c.status === 'published' ? '#E0F2FE' : '#F3F4F6',
                      color: c.status === 'published' ? '#0369A1' : '#4B5563'
                    }}>
                      {c.status === 'published' ? 'प्रकाशित' : 'ड्राफ्ट'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setPreviewContent(c)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', fontSize: 12 }}
                        title="पूर्वावलोकन देखें"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', fontSize: 12 }}
                        title="संपादन करें"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleTogglePublish(c)}
                        style={{
                          padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          background: c.status === 'published' ? '#FEE2E2' : '#DCFCE7',
                          color: c.status === 'published' ? '#991B1B' : '#166534',
                        }}
                      >
                        {c.status === 'published' ? 'अनपब्लिश' : 'पब्लिश'}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.title)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #FCA5A5', background: '#FFF', color: '#DC2626', cursor: 'pointer', fontSize: 12 }}
                        title="हटाएं"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: ADD NEW / EDIT CONTENT FORM */}
      {activeTab === 'add' && (
        <form onSubmit={handleSaveContent} style={{ background: 'var(--surface, #FFFFFF)', padding: 24, borderRadius: 14, border: '1px solid var(--border, #EADBCE)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              {editingContent ? `✏️ "${editingContent.title}" संपादित करें` : '➕ नया पावन साहित्य जोड़ें'}
            </h3>
            {editingContent && (
              <button
                type="button"
                onClick={() => { setEditingContent(null); setForm(initialForm); }}
                style={{ padding: '6px 12px', background: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}
              >
                रद्द करें और नया बनाएं
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>शीर्षक (Title) *</label>
              <input
                type="text"
                required
                placeholder="उदा. श्री हनुमान चालीसा"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              />
            </div>

            {/* Subtitle */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>उपशीर्षक (Subtitle)</label>
              <input
                type="text"
                placeholder="उदा. संकटमोचन श्री हनुमान जी की पावन चालीसा"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>श्रेणी (Category) *</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              >
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c.toLowerCase()}>{c}</option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>भाषा (Language)</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              >
                <option value="Hindi">हिन्दी (Hindi)</option>
                <option value="Sanskrit">संस्कृत (Sanskrit)</option>
                <option value="English">English</option>
                <option value="Other">अन्य (Other)</option>
              </select>
            </div>

            {/* Author */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>रचनाकार / लेखक (Author)</label>
              <input
                type="text"
                placeholder="उदा. गोस्वामी तुलसीदास"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              />
            </div>

            {/* Deity */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>इष्ट देव / विषय (Deity)</label>
              <input
                type="text"
                placeholder="उदा. श्री हनुमान जी / भगवान शिव"
                value={form.deity}
                onChange={(e) => setForm({ ...form, deity: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              />
            </div>

            {/* Cover Image URL */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>कवर इमेज URL (Cover Image)</label>
              <input
                type="text"
                placeholder="https://..."
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              />
            </div>

            {/* Access Type (Free / Premium) */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>पठन अधिकार (Access Type)</label>
              <select
                value={form.access_type}
                onChange={(e) => setForm({ ...form, access_type: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 14 }}
              >
                <option value="free">निःशुल्क पठन (Free Reading)</option>
                <option value="premium">प्रीमियम पठन (Premium Reading - Subscription)</option>
              </select>
            </div>
          </div>

          {/* FULL READING TEXT / LYRICS */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#790D13', marginBottom: 6 }}>
              📜 संपूर्ण पाठ / चौपाई / श्लोक (Full Reading Text / Lyrics) *
            </label>
            <div style={{ fontSize: 11, color: '#7C6C5E', marginBottom: 6 }}>
              यहाँ संपूर्ण दोहे, चौपाइयां या संस्कृत श्लोक देवनागरी लिपि में दर्ज करें। प्रत्येक पद के बीच एक खाली पंक्ति दें।
            </div>
            <textarea
              required
              rows={12}
              placeholder={`॥ दोहा ॥\nश्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि...\n\n॥ चौपाई ॥\nजय हनुमान ज्ञान गुन सागर...`}
              value={form.lyrics}
              onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
              style={{
                width: '100%', padding: 14, borderRadius: 8, border: '1px solid #D1D5DB',
                fontSize: 15, fontFamily: 'serif', lineHeight: '24px', background: '#FFFDF9'
              }}
            />
          </div>

          {/* MEANING & TRANSLATION */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>हिंदी भावार्थ / व्याख्या (Hindi Meaning)</label>
              <textarea
                rows={4}
                placeholder="यहाँ संपूर्ण पाठ का सरल हिंदी अर्थ दर्ज करें..."
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>अंग्रेजी या शब्दार्थ अनुवाद (Translation)</label>
              <textarea
                rows={4}
                placeholder="English translation or commentary..."
                value={form.translation}
                onChange={(e) => setForm({ ...form, translation: e.target.value })}
                style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
              />
            </div>
          </div>

          {/* PUBLISHING CONTROLS & COPYRIGHT */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#FAF4E8', padding: 14, borderRadius: 10, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>प्रकाशन स्थिति</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13 }}
              >
                <option value="published">तुरंत प्रकाशित करें (Publish Now)</option>
                <option value="draft">ड्राफ्ट के रूप में सहेजें (Save Draft)</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700, marginTop: 14 }}>
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
              />
              ⭐ मुख्य पृष्ठ पर प्रदर्शित करें (Featured Content)
            </label>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            style={{
              padding: '12px 28px', background: '#790D13', color: '#FFF', border: 'none',
              borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: 'pointer'
            }}
          >
            {editingContent ? '💾 बदलाव सुरक्षित करें' : '🚀 साहित्य प्रकाशित / सहेजें'}
          </button>
        </form>
      )}

      {/* TAB 4: BULK COPY-PASTE IMPORT */}
      {activeTab === 'bulk' && (
        <div style={{ background: 'var(--surface, #FFFFFF)', padding: 24, borderRadius: 14, border: '1px solid var(--border, #EADBCE)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px 0' }}>
            📥 बल्क कॉपी-पेस्ट आयात (Bulk Copy-Paste JSON Import)
          </h3>
          <p style={{ fontSize: 13, color: '#7C6C5E', margin: '0 0 16px 0' }}>
            यहाँ कई पुस्तकें, आरतियां, चालीसाएं, भजन अथवा मंत्रों का JSON पेस्ट करें। सिस्टम स्वचालित रूप से प्रारूप का सत्यापन, डुप्लिकेट की पहचान तथा रिकॉर्ड-दर-रिकॉर्ड समीक्षा प्रदान करेगा।
          </p>

          <textarea
            rows={10}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            style={{
              width: '100%', padding: 14, borderRadius: 8, border: '1px solid #D1D5DB',
              fontSize: 13, fontFamily: 'monospace', background: '#1E293B', color: '#F8FAFC'
            }}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 14, marginBottom: 20 }}>
            <button
              type="button"
              onClick={handleBulkPreview}
              disabled={bulkValidating}
              style={{
                padding: '10px 20px', background: '#2563EB', color: '#FFF', border: 'none',
                borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14
              }}
            >
              {bulkValidating ? 'जाँच जारी है...' : '🔍 प्रारूप जांचें एवं पूर्वावलोकन करें (Validate & Preview)'}
            </button>

            {bulkReport && selectedBulkIndices.size > 0 && (
              <button
                type="button"
                onClick={handleExecuteBulkImport}
                style={{
                  padding: '10px 24px', background: '#16A34A', color: '#FFF', border: 'none',
                  borderRadius: 8, fontWeight: 800, cursor: 'pointer', fontSize: 14
                }}
              >
                ✅ चयनित {selectedBulkIndices.size} रिकॉर्ड्स आयात करें (Import Selected)
              </button>
            )}
          </div>

          {/* BULK PREVIEW & VERIFICATION TABLE */}
          {bulkReport && (
            <div style={{ marginTop: 20, borderTop: '2px solid #EADBCE', paddingTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                  सत्यापन रिपोर्ट (Validation Report)
                </h4>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: '#16A34A' }}>वैध: {bulkReport.validCount}</span>
                  <span style={{ color: '#D97706' }}>डुप्लिकेट: {bulkReport.duplicateCount}</span>
                  <span style={{ color: '#DC2626' }}>अमान्य: {bulkReport.invalidCount}</span>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #EADBCE', textAlign: 'left', background: '#F8FAFC' }}>
                    <th style={{ padding: '8px 10px', width: 40 }}>चुनें</th>
                    <th style={{ padding: '8px 10px' }}>शीर्षक (Title)</th>
                    <th style={{ padding: '8px 10px' }}>श्रेणी</th>
                    <th style={{ padding: '8px 10px' }}>वैधता स्थिति</th>
                    <th style={{ padding: '8px 10px' }}>टिप्पणी / त्रुटि</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkReport.items.map((it) => {
                    const isChecked = selectedBulkIndices.has(it.index);
                    return (
                      <tr key={it.index} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!it.isValid || it.isDuplicate}
                            onChange={(e) => {
                              const next = new Set(selectedBulkIndices);
                              if (e.target.checked) next.add(it.index);
                              else next.delete(it.index);
                              setSelectedBulkIndices(next);
                            }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700 }}>{it.title}</td>
                        <td style={{ padding: '8px 10px' }}>{it.category}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {it.isValid && !it.isDuplicate && (
                            <span style={{ color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>वैध (Ready)</span>
                          )}
                          {it.isDuplicate && (
                            <span style={{ color: '#92400E', background: '#FEF3C7', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>डुप्लिकेट (Duplicate)</span>
                          )}
                          {!it.isValid && (
                            <span style={{ color: '#991B1B', background: '#FEE2E2', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>अमान्य (Error)</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', color: it.errors.length ? '#DC2626' : '#64748B' }}>
                          {it.errors.length ? it.errors.join(', ') : (it.isDuplicate ? 'शीर्षक पहले से मौजूद है' : 'आयात हेतु तैयार')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CATEGORIES MANAGER */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* CATEGORIES LIST */}
          <div style={{ background: 'var(--surface, #FFFFFF)', padding: 20, borderRadius: 14, border: '1px solid var(--border, #EADBCE)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>समस्त 15 सनातन श्रेणियां (Content Categories)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EADBCE', textAlign: 'left', background: '#FAF4E8' }}>
                  <th style={{ padding: '8px 10px' }}>क्रम</th>
                  <th style={{ padding: '8px 10px' }}>श्रेणी नाम</th>
                  <th style={{ padding: '8px 10px' }}>Slug</th>
                  <th style={{ padding: '8px 10px' }}>विवरण</th>
                  <th style={{ padding: '8px 10px' }}>सक्रिय</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => (
                  <tr key={cat.id || idx} style={{ borderBottom: '1px solid #F5ECE1' }}>
                    <td style={{ padding: '10px 10px', fontWeight: 700 }}>{cat.display_order || idx + 1}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 800, color: '#790D13' }}>{cat.name}</td>
                    <td style={{ padding: '10px 10px', color: '#7C6C5E' }}>{cat.slug}</td>
                    <td style={{ padding: '10px 10px' }}>{cat.description || '—'}</td>
                    <td style={{ padding: '10px 10px' }}>
                      <span style={{ color: cat.is_active ? '#16A34A' : '#9CA3AF', fontWeight: 700 }}>
                        {cat.is_active ? 'सक्रिय' : 'निष्क्रिय'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ADD CATEGORY FORM */}
          <form onSubmit={handleAddCategory} style={{ background: 'var(--surface, #FFFFFF)', padding: 20, borderRadius: 14, border: '1px solid var(--border, #EADBCE)', height: 'fit-content' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>➕ नई श्रेणी जोड़ें</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>श्रेणी का नाम *</label>
              <input
                type="text"
                required
                placeholder="उदा. स्तुति संग्रह"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>संक्षिप्त विवरण</label>
              <textarea
                rows={3}
                placeholder="श्रेणी के संबंध में..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: 13 }}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%', padding: '10px', background: '#790D13', color: '#FFF',
                border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer'
              }}
            >
              श्रेणी सहेजें
            </button>
          </form>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewContent && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: '#FAF4E8', width: '100%', maxWidth: 700, maxHeight: '85vh',
            borderRadius: 16, padding: 24, overflowY: 'auto', border: '2px solid #EADBCE', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #EADBCE', paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#790D13' }}>{previewContent.title}</h3>
                <div style={{ fontSize: 13, color: '#7C6C5E', marginTop: 4 }}>
                  {previewContent.deity ? `${previewContent.deity} • ` : ''}{previewContent.author || 'Traditional'} • {previewContent.language}
                </div>
              </div>
              <button
                onClick={() => setPreviewContent(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#7C6C5E' }}
              >
                ✕
              </button>
            </div>

            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'serif', fontSize: 16, lineHeight: '28px', color: '#2E1308', textAlign: 'center', padding: '10px 0' }}>
              {previewContent.lyrics}
            </div>

            {previewContent.meaning && (
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px dashed #EADBCE' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 14, color: '#790D13' }}>भावार्थ:</h4>
                <div style={{ fontSize: 13, color: '#4A3728', lineHeight: '20px' }}>{previewContent.meaning}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
