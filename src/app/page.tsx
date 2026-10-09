"use client";

import React, { useState, useEffect } from 'react';
import { Search, PenTool, LayoutDashboard, Settings, FileText, Loader2, Sparkles, User, Type, Database, Filter, ChevronDown, ChevronUp } from 'lucide-react';

export default function Home() {
  const [sources, setSources] = useState<{url: string, name: string, selected: boolean, scrapeCount?: string, customScrapeCount?: string, type?: string}[]>([{url: '', name: '', selected: true, scrapeCount: '1', customScrapeCount: '', type: 'LinkedIn Profile'}]);
  const [targetProfile, setTargetProfile] = useState('');
  const [contentType, setContentType] = useState('LinkedIn Post');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<any[]>([]);
  const [manualPosts, setManualPosts] = useState<any[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState('Newsletter');
  
  const [selectedBriefs, setSelectedBriefs] = useState<(number | string)[]>([]);
  const [draft, setDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const [currentView, setCurrentView] = useState('dashboard');
  const [savedDraftsList, setSavedDraftsList] = useState<any[]>([]);
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbTypeFilter, setDbTypeFilter] = useState('All');
  const [dbStatusFilter, setDbStatusFilter] = useState('All');
  const [expandedBriefs, setExpandedBriefs] = useState<(number | string)[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputMode, setInputMode] = useState<'scrape' | 'manual'>('scrape');

  useEffect(() => {
    const initSources = async () => {
      try {
        const res = await fetch('/api/sources');
        const data = await res.json();
        if (data.sources && data.sources.length > 0) {
          setSources(data.sources);
        } else {
          // Fallback to local storage if DB is empty (migrating old local data)
          const savedUrls = localStorage.getItem('saved_urls');
          if (savedUrls) {
            const parsed = JSON.parse(savedUrls);
            if (parsed.length > 0) {
              setSources(parsed.map((s: any) => ({...s, selected: s.selected !== false, scrapeCount: s.scrapeCount || '1', customScrapeCount: s.customScrapeCount || '', type: s.type || 'LinkedIn Profile'})));
            }
          }
        }
        
        // Fetch manual posts
        const manualRes = await fetch('/api/manual-posts');
        const manualData = await manualRes.json();
        if (manualData.posts) {
          setManualPosts(manualData.posts);
        }
        
        // Fetch last scraped data
        const scrapedRes = await fetch('/api/scraped-data');
        const scrapedDataResult = await scrapedRes.json();
        if (scrapedDataResult.data) {
          setScrapedData(scrapedDataResult.data);
        }
      } catch (e) {
        console.error("Failed to fetch sources from DB", e);
      } finally {
        setIsLoaded(true); // Only set isLoaded to true AFTER the initial DB load is completely finished!
      }
    };
    initSources();

    const savedDrafts = localStorage.getItem('saved_drafts');
    if (savedDrafts) {
      try {
        setSavedDraftsList(JSON.parse(savedDrafts));
      } catch (e) {}
    }
    const savedTargetProfile = localStorage.getItem('target_profile');
    if (savedTargetProfile !== null) {
      setTargetProfile(savedTargetProfile);
    } else {
      setTargetProfile('https://www.linkedin.com/in/parul-aggarwal-833bbb170/');
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('saved_urls', JSON.stringify(sources));
      localStorage.setItem('target_profile', targetProfile);
      
      // Save sources to cloud DB globally
      fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources })
      }).catch(console.error);

      // Save manual posts
      fetch('/api/manual-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: manualPosts })
      }).catch(console.error);

      // Save scraped data
      fetch('/api/scraped-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: scrapedData })
      }).catch(console.error);
    }
  }, [sources, manualPosts, scrapedData, targetProfile, isLoaded]);

  const handleUrlChange = (index: number, value: string) => {
    const newSources = [...sources];
    newSources[index].url = value;
    setSources(newSources);
  };
  
  const handleNameChange = (index: number, value: string) => {
    const newSources = [...sources];
    newSources[index].name = value;
    setSources(newSources);
  };
  const handleToggleSelect = (index: number) => {
    const newSources = [...sources];
    newSources[index].selected = !newSources[index].selected;
    setSources(newSources);
  };
  
  const addSource = () => setSources([...sources, {url: '', name: '', selected: true, scrapeCount: '1', customScrapeCount: '', type: 'LinkedIn Profile'}]);
  const removeSource = (index: number) => setSources(sources.filter((_, i) => i !== index));

  const handleScrape = async () => {
    const validSources = sources.filter(s => s.selected && s.url.trim() !== '');
    if (validSources.length === 0) {
      alert("Please select at least one source to scrape.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: validSources })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setScrapedData(data.data);
      } else {
        alert(`Scraping Error: ${data.error || 'Failed to scrape'}`);
      }
    } catch (error) {
      console.error("Failed to scrape", error);
      alert("Network error: Failed to reach scraping endpoint.");
    }
    setIsLoading(false);
  };

  const handleAddManualPost = () => {
    if (!manualText.trim()) return;
    const newPost = {
      id: `manual_${Date.now()}`,
      isManual: true,
      source: manualAuthor || 'Manual Entry',
      title: manualTitle || `Manual ${manualType} - ${new Date().toLocaleDateString()}`,
      type: manualType,
      summary: manualText.substring(0, 200) + '...',
      originalText: manualText,
      dateAdded: new Date().toLocaleString()
    };
    setManualPosts([newPost, ...manualPosts]);
    setManualText('');
    setManualAuthor('');
    setManualTitle('');
    setManualType('Newsletter');
    // Optional: Switch back to scrape mode if desired, but they might want to add more
    // setInputMode('scrape'); 
  };

  const handleRemoveManualPost = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setManualPosts(manualPosts.filter(p => p.id !== id));
    setSelectedBriefs(selectedBriefs.filter(b => b !== id));
  };

  const handleToggleBrief = (id: number | string) => {
    setSelectedBriefs(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleToggleExpandBrief = (e: React.MouseEvent, id: number | string) => {
    e.stopPropagation();
    setExpandedBriefs(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleGenerateContent = async (generateType: 'summary' | 'post') => {
    if (selectedBriefs.length === 0) {
      alert("Please select at least one brief.");
      return;
    }
    if (generateType === 'post' && !targetProfile.trim()) {
      alert("Please paste the LinkedIn Profile URL of the author before generating a post.");
      return;
    }
    const allBriefs = [...manualPosts, ...scrapedData];
    const briefsToUse = allBriefs.filter(b => selectedBriefs.includes(b.id));
    setIsDrafting(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefs: briefsToUse, targetProfile, contentType, generateType })
      });
      const data = await res.json();
      if (data.draft) {
        setDraft(data.draft);
      } else {
        setDraft("Error generating content. Please check your Groq API key.");
      }
    } catch (error) {
      console.error("Failed to generate content", error);
      setDraft("An error occurred during generation.");
    }
    setIsDrafting(false);
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    const allBriefs = [...manualPosts, ...scrapedData];
    const firstBrief = allBriefs.find(b => selectedBriefs.includes(b.id));
    const newDrafts = [...savedDraftsList, {
      title: firstBrief?.title || 'Custom Draft',
      content: draft,
      date: new Date().toLocaleString()
    }];
    setSavedDraftsList(newDrafts);
    localStorage.setItem('saved_drafts', JSON.stringify(newDrafts));
    alert('Draft saved to Saved Drafts!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    alert('Copied to clipboard!');
  };

  const filteredSources = sources.map((source, originalIdx) => ({ source, originalIdx }))
    .filter(({ source }) => {
      if (dbSearchQuery) {
        const query = dbSearchQuery.toLowerCase();
        if (!source.name?.toLowerCase().includes(query) && !source.url.toLowerCase().includes(query)) return false;
      }
      if (dbTypeFilter !== 'All' && (source.type || 'LinkedIn Profile') !== dbTypeFilter) return false;
      if (dbStatusFilter !== 'All') {
        if (dbStatusFilter === 'Included' && !source.selected) return false;
        if (dbStatusFilter === 'Excluded' && source.selected) return false;
      }
      return true;
    });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <Sparkles className="w-6 h-6" />
            <span>HealthCopy AI</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button onClick={() => setCurrentView('database')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${currentView === 'database' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Database className="w-5 h-5" />
            Sources DB
          </button>
          <button onClick={() => setCurrentView('drafts')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${currentView === 'drafts' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <FileText className="w-5 h-5" />
            Saved Drafts
          </button>
          <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-colors ${currentView === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 bg-white">
          <h1 className="text-xl font-semibold">
            {currentView === 'dashboard' && 'LinkedIn AI Assistant'}
            {currentView === 'database' && 'Sources Database'}
            {currentView === 'drafts' && 'Saved Drafts'}
            {currentView === 'settings' && 'Settings'}
          </h1>
        </header>

        {currentView === 'dashboard' && (
          <div className="flex-1 overflow-y-auto p-8 flex gap-8">
          
          {/* Left Column: Scraping & Briefs */}
          <div className="w-1/2 flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex gap-6 border-b border-slate-200 mb-6 pb-2">
                <button 
                  onClick={() => setInputMode('scrape')}
                  className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${inputMode === 'scrape' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  1. Automated Scraping
                </button>
                <button 
                  onClick={() => setInputMode('manual')}
                  className={`text-lg font-semibold pb-2 border-b-2 transition-colors ${inputMode === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  1. Manual Entry
                </button>
              </div>

              {inputMode === 'scrape' ? (
                <>
                  <div className="space-y-4 mb-4 max-h-[22rem] overflow-y-auto pr-2">
                    {sources.map((source, idx) => (
                      <div key={idx} className={`flex gap-3 relative bg-slate-50 p-3 rounded-lg border ${source.selected ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-100 opacity-60'}`}>
                        <div className="pt-2 pl-1">
                          <input 
                            type="checkbox" 
                            checked={source.selected} 
                            onChange={() => handleToggleSelect(idx)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Include in scrape"
                          />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              value={source.url}
                              onChange={(e) => handleUrlChange(idx, e.target.value)}
                              placeholder="Enter LinkedIn Profile or Newsletter URL..."
                              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                            />
                          </div>
                          <div className="flex flex-col gap-3">
                            <div className="relative w-full">
                              <Type className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                type="text" 
                                value={source.name}
                                onChange={(e) => handleNameChange(idx, e.target.value)}
                                placeholder="Optional: Name of this profile/newsletter..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                              />
                            </div>
                            <div className="flex gap-2 w-full relative">
                              <select 
                                value={source.type || 'LinkedIn Profile'} 
                                onChange={(e) => {
                                  const newSources = [...sources];
                                  newSources[idx].type = e.target.value;
                                  setSources(newSources);
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                title="Source Type"
                              >
                                <option value="LinkedIn Profile">LinkedIn Profile</option>
                                <option value="Newsletter">Newsletter</option>
                                <option value="Blog">Blog</option>
                                <option value="Other">Other</option>
                              </select>
                              <select 
                                value={source.scrapeCount || '1'} 
                                onChange={(e) => {
                                  const newSources = [...sources];
                                  newSources[idx].scrapeCount = e.target.value;
                                  setSources(newSources);
                                }}
                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                title="Number of posts to fetch"
                              >
                                <option value="1">Latest Post</option>
                                <option value="3">Last 3 Posts</option>
                                <option value="5">Last 5 Posts</option>
                                <option value="all">All Posts</option>
                                <option value="custom">Custom...</option>
                              </select>
                              {source.scrapeCount === 'custom' && (
                                <input 
                                  type="number" 
                                  min="1"
                                  placeholder="Qty"
                                  value={source.customScrapeCount || ''}
                                  onChange={(e) => {
                                    const newSources = [...sources];
                                    newSources[idx].customScrapeCount = e.target.value;
                                    setSources(newSources);
                                  }}
                                  className="w-24 px-2 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removeSource(idx)} className="px-2 self-start mt-1 text-slate-400 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <button onClick={addSource} className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">+ Add another link</button>
                    <button 
                      onClick={handleScrape}
                      disabled={isLoading || sources.filter(s => s.selected).every(s => !s.url.trim())}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Scrape & Analyze"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
                  <div className="flex gap-2">
                    <select 
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value)}
                      className="px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="Newsletter">Newsletter</option>
                      <option value="LinkedIn Post">LinkedIn Post</option>
                      <option value="Blog Post">Blog Post</option>
                      <option value="Other">Other</option>
                    </select>
                    <input 
                      type="text" 
                      placeholder="Title (e.g. Health Tech #4)"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Author Name / Link (Optional)"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <textarea
                    placeholder="Paste the post content here..."
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px] resize-y"
                  />
                  <button 
                    onClick={handleAddManualPost}
                    disabled={!manualText.trim()}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                  >
                    Save Manual Post to Database
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4">2. Audience & Format (Required)</h2>
              <div className="space-y-4">
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="url" 
                    value={targetProfile}
                    onChange={(e) => setTargetProfile(e.target.value)}
                    placeholder="Paste the LinkedIn Profile URL of the author..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="relative">
                  <Type className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow appearance-none"
                  >
                    <option value="LinkedIn Post">LinkedIn Post</option>
                    <option value="Newsletter Issue">Newsletter Issue</option>
                    <option value="Twitter Thread">Twitter Thread</option>
                    <option value="Blog Post">Blog Post</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">3. Select a Topic Brief</h2>
                {(scrapedData.length > 0 || manualPosts.length > 0) && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleGenerateContent('summary')}
                      className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                      Summarize Selected
                    </button>
                    <button 
                      onClick={() => handleGenerateContent('post')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                    >
                      Draft Post
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                {scrapedData.length === 0 && manualPosts.length === 0 && !isLoading && (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <Search className="w-12 h-12 text-slate-300" />
                    <p>Scrape a profile or add manual posts to see extracted topics here.</p>
                  </div>
                )}
                
                {[...manualPosts, ...scrapedData].map((brief) => (
                  <div 
                    key={brief.id} 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedBriefs.includes(brief.id) ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'} ${brief.isManual ? 'border-dashed' : ''}`}
                    onClick={() => handleToggleBrief(brief.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedBriefs.includes(brief.id)} 
                          readOnly 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" 
                        />
                        <h3 className="font-semibold text-slate-900">{brief.title}</h3>
                        {brief.isManual && <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">Manual</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {brief.dateAdded && (
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0">
                            {brief.dateAdded}
                          </div>
                        )}
                        {brief.impressions && (
                          <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1 shrink-0">
                            📈 {brief.impressions.toLocaleString()} views
                          </div>
                        )}
                        {brief.isManual && (
                          <button 
                            onClick={(e) => handleRemoveManualPost(e, brief.id)}
                            className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-slate-400 transition-colors"
                            title="Delete manual post"
                          >
                            ✕
                          </button>
                        )}
                        <button 
                          onClick={(e) => handleToggleExpandBrief(e, brief.id)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                          title="View full content"
                        >
                          {expandedBriefs.includes(brief.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    {brief.source && <p className="text-xs text-slate-500 mb-2 truncate ml-7">Source: {brief.source}</p>}
                    
                    {expandedBriefs.includes(brief.id) ? (
                      <div className="ml-7 mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-sm font-medium text-slate-800">Summary:</p>
                        <p className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200">{brief.summary}</p>
                        <p className="text-sm font-medium text-slate-800">Original Content:</p>
                        <p className="text-sm text-slate-600 bg-white p-3 rounded border border-slate-200 max-h-40 overflow-y-auto whitespace-pre-wrap">{brief.originalText}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 ml-7 line-clamp-2">{brief.summary}</p>
                    )}

                    <div className="mt-3 ml-7 flex justify-between items-center">
                      {brief.engagementRate ? (
                         <span className="text-xs text-slate-500 font-medium">Engagement: {brief.engagementRate}</span>
                      ) : <span />}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Right Column: AI Draft Generation */}
            <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-indigo-500" /> 
                  4. Writer's Workspace & AI Content
                </h2>
                <div className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                  Editor
                </div>
              </div>
              
              <div className="flex-1 p-6 flex flex-col relative">
                {isDrafting ? (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-indigo-600 font-medium">Crafting the perfect content...</p>
                  </div>
                ) : null}

                {!draft && !isDrafting ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3">
                    <PenTool className="w-12 h-12 text-slate-300" />
                    <p>Write your own post here, or use the AI buttons on the left.</p>
                  </div>
                ) : (
                  <textarea 
                    className="flex-1 w-full p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-700 leading-relaxed bg-slate-50"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write or edit your content here..."
                  />
                )}
              </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={handleSaveDraft}
                disabled={!draft || isDrafting}
                className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Save Draft
              </button>
              <button 
                onClick={handleCopy}
                disabled={!draft || isDrafting}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Copy for LinkedIn
              </button>
            </div>
          </div>

          </div>
        )}

        {currentView === 'database' && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Sources Database</h2>
              <button 
                onClick={() => {
                  setCurrentView('dashboard');
                  addSource();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-1"
              >
                + Add Source
              </button>
            </div>

            <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Filter className="w-5 h-5" />
                <span>Filters:</span>
              </div>
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={dbSearchQuery}
                  onChange={(e) => setDbSearchQuery(e.target.value)}
                  placeholder="Search by Name or URL..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select 
                value={dbTypeFilter}
                onChange={(e) => setDbTypeFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="LinkedIn Profile">LinkedIn Profile</option>
                <option value="Newsletter">Newsletter</option>
                <option value="Blog">Blog</option>
                <option value="Other">Other</option>
              </select>
              <select 
                value={dbStatusFilter}
                onChange={(e) => setDbStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Included">Included</option>
                <option value="Excluded">Excluded</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                    <th className="p-4 font-semibold w-12">#</th>
                    <th className="p-4 font-semibold w-1/4">Name</th>
                    <th className="p-4 font-semibold w-32">Type</th>
                    <th className="p-4 font-semibold">URL</th>
                    <th className="p-4 font-semibold w-24">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">No sources found matching your filters.</td>
                    </tr>
                  ) : filteredSources.map(({ source: s, originalIdx: idx }) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-4 text-slate-400">{idx + 1}</td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => handleNameChange(idx, e.target.value)}
                          placeholder="Unnamed Source"
                          className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 outline-none text-slate-900 font-medium transition-colors"
                        />
                      </td>
                      <td className="p-4 text-slate-600 text-sm">
                        <select
                          value={s.type || 'LinkedIn Profile'}
                          onChange={(e) => {
                            const newSources = [...sources];
                            newSources[idx].type = e.target.value;
                            setSources(newSources);
                          }}
                          className="bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1 py-1 outline-none cursor-pointer transition-colors"
                        >
                          <option value="LinkedIn Profile">LinkedIn Profile</option>
                          <option value="Newsletter">Newsletter</option>
                          <option value="Blog">Blog</option>
                          <option value="Other">Other</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={s.url}
                            onChange={(e) => handleUrlChange(idx, e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 outline-none text-indigo-600 transition-colors"
                          />
                          {s.url && (
                            <a href={s.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600 flex-shrink-0" title="Open Link">
                              ↗
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleSelect(idx)}
                          className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${s.selected ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                          {s.selected ? 'Included' : 'Excluded'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => removeSource(idx)} className="text-slate-400 hover:text-red-500 px-2 py-1 rounded" title="Delete Source">✕</button>
                      </td>
                    </tr>
                  ))}
                  {sources.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">No sources saved yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'drafts' && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            <h2 className="text-2xl font-bold">Your Saved Drafts</h2>
            {savedDraftsList.length === 0 ? (
              <p className="text-slate-500">No drafts saved yet. Generate and save a draft from the Dashboard!</p>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {savedDraftsList.map((d, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-slate-900">{d.title}</h3>
                      <span className="text-xs text-slate-400">{d.date}</span>
                    </div>
                    <p className="text-sm text-slate-600 flex-1 whitespace-pre-wrap">{d.content.substring(0, 150)}...</p>
                    <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
                      <button onClick={() => { navigator.clipboard.writeText(d.content); alert('Copied!'); }} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">Copy Full Post</button>
                      <button onClick={() => {
                        const updated = savedDraftsList.filter((_, idx) => idx !== i);
                        setSavedDraftsList(updated);
                        localStorage.setItem('saved_drafts', JSON.stringify(updated));
                      }} className="text-sm font-medium text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl">
              <p className="text-slate-600 mb-4">This section allows you to configure your API keys and application settings.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Groq API Key</label>
                  <input type="password" value="********************************" readOnly className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed" />
                  <p className="text-xs text-slate-500 mt-1">Configured securely via environment variables (.env.local).</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
