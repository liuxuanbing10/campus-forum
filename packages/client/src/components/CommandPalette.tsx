import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  Home, Users, Bell, MessageSquare, Search, Settings, PenSquare,
  Trophy, Shield, BookOpen, Download, UserRound, Star,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { searchApi } from '../lib/api';
import type { SearchResult } from '../types/api';

/**
 * 全局命令面板（Cmd/Ctrl + K）
 * 页面导航 + 帖子搜索 + 快捷操作
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  // 全局快捷键
  useHotkeys('meta+k, ctrl+k', (e) => {
    e.preventDefault();
    setOpen(v => !v);
  }, { enableOnFormTags: true });

  useHotkeys('esc', () => setOpen(false), { enableOnFormTags: true });

  // 搜索帖子（防抖）
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchApi.search(query.trim(), 1);
        setResults(res.data.posts || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const itemClassName =
    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer select-none data-[selected=true]:bg-[var(--card)] data-[selected=true]:text-[var(--acc)]';

  const go = (path: string) => { setOpen(false); navigate(path); setQuery(''); };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="命令面板"
      className="fixed inset-0 z-[999] flex items-start justify-center pt-[12vh]"
      overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-sm"
      contentClassName="w-full max-w-xl mx-4 rounded-xl border border-[var(--line)] bg-[var(--g2)] shadow-2xl overflow-hidden"
    >
      {/* 搜索框 */}
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="搜索帖子、跳转页面… （按 Esc 关闭）"
        className="w-full px-5 py-4 text-base bg-transparent outline-none border-b border-[var(--line)] text-[var(--ink)] placeholder:text-[var(--soft)]"
      />

      <Command.List className="max-h-[50vh] overflow-y-auto p-2">
        <Command.Empty className="py-8 text-center text-sm text-[var(--soft)]">
          {searching ? '搜索中…' : '没有找到结果'}
        </Command.Empty>

        {/* 帖子搜索结果 */}
        {results.length > 0 && (
          <Command.Group heading="帖子" className="text-[var(--acc)]">
            {results.map(p => (
              <Command.Item key={p.id} value={`post-${p.id}`} onSelect={() => go(`/post/${p.id}`)} className={itemClassName}>
                <span className="w-8 h-8 rounded-lg bg-[var(--card)] flex items-center justify-center shrink-0">
                  <PenSquare className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[var(--ink)]">{p.title}</span>
                  <span className="block text-[11px] text-[var(--soft)] truncate">{p.authorName}</span>
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* 页面导航 */}
        <Command.Group heading="页面" className="text-[var(--acc)]">
          <Command.Item value="home" onSelect={() => go('/')} className={itemClassName}>
            <Home className="w-4 h-4" /> 首页
          </Command.Item>
          <Command.Item value="teams" onSelect={() => go('/teams')} className={itemClassName}>
            <Users className="w-4 h-4" /> 团队
          </Command.Item>
          <Command.Item value="notifications" onSelect={() => go('/notifications')} className={itemClassName}>
            <Bell className="w-4 h-4" /> 通知
          </Command.Item>
          <Command.Item value="messages" onSelect={() => go('/messages')} className={itemClassName}>
            <MessageSquare className="w-4 h-4" /> 消息
          </Command.Item>
          <Command.Item value="search" onSelect={() => go('/search')} className={itemClassName}>
            <Search className="w-4 h-4" /> 搜索
          </Command.Item>
          <Command.Item value="favorites" onSelect={() => go('/favorites')} className={itemClassName}>
            <Star className="w-4 h-4" /> 收藏
          </Command.Item>
          <Command.Item value="achievements" onSelect={() => go('/achievements')} className={itemClassName}>
            <Trophy className="w-4 h-4" /> 成就
          </Command.Item>
          <Command.Item value="settings" onSelect={() => go('/settings')} className={itemClassName}>
            <Settings className="w-4 h-4" /> 设置
          </Command.Item>
          <Command.Item value="rules" onSelect={() => go('/rules')} className={itemClassName}>
            <BookOpen className="w-4 h-4" /> 社区公约
          </Command.Item>
          <Command.Item value="download" onSelect={() => go('/download')} className={itemClassName}>
            <Download className="w-4 h-4" /> 下载 App
          </Command.Item>
        </Command.Group>

        {/* 操作 */}
        <Command.Group heading="操作" className="text-[var(--acc)]">
          <Command.Item value="new-post" onSelect={() => go('/new')} className={itemClassName}>
            <PenSquare className="w-4 h-4" /> 发布新帖
          </Command.Item>
          <Command.Item value="create-team" onSelect={() => go('/teams/new')} className={itemClassName}>
            <Users className="w-4 h-4" /> 创建团队
          </Command.Item>
          {user && (
            <Command.Item value="profile" onSelect={() => go(`/user/${user.id}`)} className={itemClassName}>
              <UserRound className="w-4 h-4" /> 我的主页
            </Command.Item>
          )}
          {user && (user.role === 'admin' || user.role === 'superadmin') && (
            <Command.Item value="admin" onSelect={() => go('/admin')} className={itemClassName}>
              <Shield className="w-4 h-4" /> 管理后台
            </Command.Item>
          )}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}