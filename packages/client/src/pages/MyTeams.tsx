import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Heart, Users, Search } from 'lucide-react';
import { teamsApi } from '../lib/api';
import type { Team } from '@campus-forum/core';
import TeamCard from '../components/TeamCard';
import { toastStore } from '../App';

type TabType = 'all' | 'owned' | 'admin' | 'member' | 'favorites';

export default function MyTeams() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('all');
  const [loading, setLoading] = useState(true);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [owned, setOwned] = useState<Team[]>([]);
  const [adminOf, setAdminOf] = useState<Team[]>([]);
  const [memberOf, setMemberOf] = useState<Team[]>([]);
  const [favorites, setFavorites] = useState<Team[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [myRes, favRes] = await Promise.all([
        teamsApi.getMyTeams(),
        teamsApi.getFavorites(),
      ]);
      setAllTeams(myRes.data.teams);
      setOwned(myRes.data.owned);
      setAdminOf(myRes.data.adminOf);
      setMemberOf(myRes.data.memberOf);
      setFavorites(favRes.data.teams);
    } catch {
      toastStore.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCurrentTeams = () => {
    switch (tab) {
      case 'owned': return owned;
      case 'admin': return adminOf;
      case 'member': return memberOf;
      case 'favorites': return favorites;
      default: return allTeams;
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      toastStore.warning('请输入邀请码');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await teamsApi.joinByCode(inviteCode.trim());
      toastStore.success(res.data.message);
      setShowInviteModal(false);
      setInviteCode('');
      loadData();
      setTimeout(() => navigate(`/teams/${res.data.teamId}`), 500);
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '加入失败');
    } finally {
      setInviteLoading(false);
    }
  };

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'owned', label: '我创建的' },
    { key: 'admin', label: '我管理的' },
    { key: 'member', label: '我加入的' },
    { key: 'favorites', label: '收藏' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-campus-text-primary font-display">我的团队</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn-secondary btn-sm btn-inline flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            邀请码加入
          </button>
          <button
            onClick={() => navigate('/teams/new')}
            className="btn-primary btn-sm btn-inline flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            创建团队
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as TabType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-primary text-white'
                : 'text-campus-text-secondary hover:bg-surface-hover hover:text-campus-text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-campus-text-secondary">加载中...</div>
      ) : getCurrentTeams().length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 mx-auto text-campus-text-tertiary mb-4" />
          <p className="text-campus-text-secondary mb-4">
            {tab === 'favorites' ? '还没有收藏的团队' : '还没有加入任何团队'}
          </p>
          <button
            onClick={() => navigate('/teams')}
            className="btn-primary btn-inline text-sm"
          >
            去发现团队
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {getCurrentTeams().map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onClick={() => navigate(`/teams/${team.id}`)}
              showFavorite={tab === 'favorites'}
              onFavoriteChange={loadData}
            />
          ))}
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">通过邀请码加入</h3>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="请输入邀请码"
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors mb-4"
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowInviteModal(false); setInviteCode(''); }}
                className="btn-secondary btn-inline text-sm"
              >
                取消
              </button>
              <button
                onClick={handleJoinByCode}
                disabled={inviteLoading}
                className="btn-primary btn-inline text-sm disabled:opacity-50"
              >
                {inviteLoading ? '加入中...' : '加入'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
