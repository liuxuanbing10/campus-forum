import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, ArrowUpDown } from 'lucide-react';
import { teamsApi } from '../lib/api';
import type { Team, TeamCategory } from '@campus-forum/core';
import TeamCard from '../components/TeamCard';
import { toastStore } from '../App';
import Skeleton from '../components/Skeleton';

type SortType = 'popular' | 'newest' | 'name' | 'posts';

export default function Teams() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState(0);
  const [sort, setSort] = useState<SortType>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions = [
    { key: 'popular', label: '最热门' },
    { key: 'newest', label: '最新创建' },
    { key: 'posts', label: '帖子最多' },
    { key: 'name', label: '名称排序' },
  ];

  const loadCategories = async () => {
    try {
      const res = await teamsApi.getCategories();
      setCategories(res.data.categories);
    } catch {}
  };

  const loadTeams = async () => {
    setLoading(true);
    try {
      if (searchMode && searchQuery.trim()) {
        const res = await teamsApi.searchTeams(searchQuery, activeCategory || undefined);
        setTeams(res.data.teams);
      } else {
        const res = await teamsApi.getTeams(1, activeCategory || undefined, sort);
        setTeams(res.data.teams);
      }
    } catch {
      toastStore.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTeams();
  }, [activeCategory, sort, searchMode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchMode(searchQuery.trim().length >= 2);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchMode(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-campus-text-primary font-display">发现团队</h1>
        <button
          onClick={() => navigate('/teams/new')}
          className="btn-primary btn-sm btn-inline flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          创建团队
        </button>
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-campus-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索团队名称（至少2个字）"
            className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchMode && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-campus-text-secondary hover:text-primary transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </form>

      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
          <button
            onClick={() => setActiveCategory(0)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeCategory === 0
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-campus-text-secondary hover:border-primary/30 hover:text-primary'
            }`}
          >
            全部
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-campus-text-secondary hover:border-primary/30 hover:text-primary'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-sm text-campus-text-secondary hover:border-primary/30 hover:text-primary transition-colors whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOptions.find(o => o.key === sort)?.label}
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 bg-surface border border-border rounded-xl shadow-lg py-1 z-10 min-w-[120px]">
              {sortOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setSort(opt.key as SortType); setShowSortMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    sort === opt.key ? 'text-primary bg-primary/10' : 'text-campus-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton variant="list" count={6} />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16">
          <Filter className="w-16 h-16 mx-auto text-campus-text-tertiary mb-4" />
          <p className="text-campus-text-secondary">
            {searchMode ? '没有找到匹配的团队' : '暂无团队，快来创建第一个吧！'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onClick={() => navigate(`/teams/${team.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
