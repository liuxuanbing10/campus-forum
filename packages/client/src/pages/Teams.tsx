import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users } from 'lucide-react';
import { teamsApi, Team } from '../lib/api';
import TeamCard from '../components/TeamCard';
import { toastStore } from '../App';

export default function Teams() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const res = await teamsApi.getTeams();
      setTeams(res.data.teams);
    } catch (err) {
      toastStore.error('加载团队失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTeams();
      return;
    }
    try {
      setLoading(true);
      const res = await teamsApi.searchTeams(searchQuery);
      setTeams(res.data.teams);
    } catch (err) {
      toastStore.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-campus-text-primary font-display mb-1">团队</h1>
          <p className="text-sm text-campus-text-secondary">浏览和加入校园社团与团队</p>
        </div>
        <button
          onClick={() => navigate('/teams/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建团队
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-campus-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="搜索团队名称..."
          className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          onClick={handleSearch}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
        >
          搜索
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-campus-text-secondary">加载中...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-campus-text-tertiary/50" />
          <p className="text-campus-text-secondary mb-2">暂无团队</p>
          <p className="text-sm text-campus-text-tertiary">成为第一个创建团队的人吧！</p>
          <button
            onClick={() => navigate('/teams/new')}
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            创建团队
          </button>
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