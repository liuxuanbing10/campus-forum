import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { messageApi, Conversation, Message } from '../lib/api';
import { toastStore } from '../App';
import { ArrowLeft, Send, MessageCircle, Loader2, Search, Plus, X } from 'lucide-react';
import api from '../lib/api';
import { wsService } from '../lib/websocket';

export default function MessagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; display_name?: string }[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(() => {
    if (!user) return;
    messageApi.getConversations().then(r => {
      setConversations(r.data.conversations || []);
      const total = (r.data.conversations || []).reduce((sum: number, c: Conversation) => sum + (c.unread_count || 0), 0);
      setUnreadTotal(total);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadConversations().finally(() => setLoading(false));
  }, [user, loadConversations]);

  useEffect(() => {
    if (id) {
      messageApi.getMessages(parseInt(id)).then(r => {
        setMessages(r.data.messages || []);
        loadConversations();
      }).catch(() => toastStore.error('加载消息失败'));
    }
  }, [id, loadConversations]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // WebSocket 实时消息监听
  useEffect(() => {
    const handleNewMessage = (data: { conversationId: number; senderId: number; senderName: string; content: string }) => {
      if (id && parseInt(id) === data.conversationId) {
        const newMessage: Message = {
          id: Date.now(),
          conversation_id: data.conversationId,
          sender_id: data.senderId,
          content: data.content,
          created_at: new Date().toISOString(),
          is_read: 1,
          sender_name: data.senderName,
        };
        setMessages(prev => [...prev, newMessage]);
      }
      loadConversations();
    };

    wsService.on('new_message', handleNewMessage);
    return () => wsService.off('new_message', handleNewMessage);
  }, [id, loadConversations]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await messageApi.send(parseInt(id!), text.trim());
      setText('');
      const r = await messageApi.getMessages(parseInt(id!));
      setMessages(r.data.messages || []);
      loadConversations();
    } catch { toastStore.error('发送失败'); }
    finally { setSending(false); }
  };

  // 搜索用户
  const handleSearchUser = async (q: string) => {
    setSearchUser(q);
    if (q.trim().length < 1) { setSearchResults([]); return; }
    try {
      const res = await api.get('/search/users', { params: { q: q.trim() } });
      setSearchResults(res.data.users || []);
    } catch { setSearchResults([]); }
  };

  // 发起新对话
  const startNewChat = (userId: number) => {
    setShowNewChat(false);
    setSearchUser('');
    setSearchResults([]);
    // 发送一条空消息来创建会话，或者直接跳转
    navigate(`/messages/${userId}`);
  };

  if (loading) return <div className="text-center py-12 text-campus-text-tertiary font-body">加载中...</div>;

  // If no conversation selected, show list
  if (!id) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <div className="flex items-center justify-between mb-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-campus-text-tertiary hover:text-primary transition-colors font-body">
            <ArrowLeft className="w-4 h-4" /> 返回首页
          </Link>
          <button onClick={() => setShowNewChat(!showNewChat)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-body hover:bg-primary-hover transition-colors">
            <Plus className="w-4 h-4" /> 新对话
          </button>
        </div>

        <h1 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5" /> 私信
          {unreadTotal > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadTotal} 未读</span>}
        </h1>

        {/* 新对话搜索 */}
        {showNewChat && (
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold font-display">搜索用户发起新对话</h3>
              <button onClick={() => setShowNewChat(false)} className="p-1 hover:bg-surface-hover rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-campus-text-tertiary" />
              <input value={searchUser} onChange={e => handleSearchUser(e.target.value)}
                placeholder="搜索用户名..." className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map(u => (
                <button key={u.id} onClick={() => startNewChat(u.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-surface-hover transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-sm font-bold">
                    {u.display_name?.[0] || u.username[0]}
                  </div>
                  <div>
                    <p className="text-sm font-body">{u.display_name || u.username}</p>
                    <p className="text-xs text-campus-text-tertiary">@{u.username}</p>
                  </div>
                </button>
              ))}
              {searchUser && searchResults.length === 0 && <p className="text-center text-xs text-campus-text-tertiary py-4 font-body">未找到用户</p>}
            </div>
          </div>
        )}

        {conversations.length === 0 && !showNewChat && <p className="text-center py-12 text-campus-text-tertiary font-body">暂无会话，点击"新对话"开始聊天</p>}
        <div className="space-y-2">
          {conversations.map(c => (
            <Link key={c.id} to={`/messages/${c.id}`}
              className="flex items-center gap-3 p-4 card hover:bg-surface-hover transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold shrink-0">
                {c.other_username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium font-display text-sm">{c.other_username}</span>
                  {c.unread_count > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{c.unread_count}</span>}
                </div>
                <p className="text-xs text-campus-text-tertiary truncate mt-0.5 font-body">{c.last_message}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Chat view
  const conv = conversations.find(c => c.id === parseInt(id));
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        <Link to="/messages" className="p-1 hover:bg-surface-hover rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold text-sm">
          {conv?.other_username?.[0] || '?'}
        </div>
        <span className="font-medium font-display">{conv?.other_username || '对话'}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-1">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-xl text-sm font-body ${
              m.sender_id === user?.id ? 'bg-primary text-white' : 'bg-surface-hover text-campus-text-secondary'
            }`}>
              {m.content}
              <div className={`text-xs mt-1 ${m.sender_id === user?.id ? 'text-white/60' : 'text-campus-text-tertiary'}`}>
                {new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..." className="flex-1 px-4 py-2.5 rounded-xl bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary" />
        <button onClick={handleSend} disabled={sending || !text.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-1 font-body">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
