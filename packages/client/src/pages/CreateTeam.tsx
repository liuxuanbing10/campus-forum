import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Lock, Unlock } from 'lucide-react';
import { teamsApi, CreateTeamData } from '../lib/api';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';

export default function CreateTeam() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [form, setForm] = useState<CreateTeamData>({
    name: '',
    description: '',
    isPublic: true,
    maxMembers: 50,
  });
  const [loading, setLoading] = useState(false);

  if (!user) {
    toastStore.warning('请先登录');
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toastStore.warning('请输入团队名称');
      return;
    }
    try {
      setLoading(true);
      const res = await teamsApi.createTeam(form);
      toastStore.success('团队创建成功');
      navigate(`/teams/${res.data.team.id}`);
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/teams')}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-campus-text-secondary" />
        </button>
        <h1 className="text-2xl font-bold text-campus-text-primary font-display">创建团队</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-campus-text-primary mb-2">
            团队名称 <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="请输入团队名称（2-30个字符）"
            maxLength={30}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-campus-text-primary mb-2">
            团队描述
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="请输入团队描述（最多500个字符）"
            maxLength={500}
            rows={4}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
          <div className="text-right text-xs text-campus-text-tertiary mt-1">
            {(form.description || '').length}/500
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-campus-text-primary mb-3">
            团队类型
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: true })}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                form.isPublic
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/30 text-campus-text-secondary'
              }`}
            >
              <Unlock className="w-5 h-5" />
              <span className="font-medium">公开团队</span>
              <span className="text-xs text-campus-text-tertiary">任何人可直接加入</span>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: false })}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                !form.isPublic
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/30 text-campus-text-secondary'
              }`}
            >
              <Lock className="w-5 h-5" />
              <span className="font-medium">私密团队</span>
              <span className="text-xs text-campus-text-tertiary">需管理员审批</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-campus-text-primary mb-2">
            最大成员数
          </label>
          <input
            type="number"
            value={form.maxMembers}
            onChange={(e) => setForm({ ...form, maxMembers: Math.max(2, Math.min(200, Number(e.target.value) || 2)) })}
            min={2}
            max={200}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-campus-text-tertiary mt-1">范围：2-200</p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/teams')}
            className="flex-1 px-4 py-3 border border-border hover:border-primary/50 text-campus-text-primary rounded-xl font-medium transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                创建团队
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}