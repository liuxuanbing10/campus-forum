import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Lock, Unlock, ArrowLeft, Settings, LogOut,
  UserPlus, UserMinus, Crown, Shield, Heart, Copy,
  FileText, Megaphone, Plus, Trash2, Pin, Check, X, ImagePlus,
  Upload, Download as DownloadIcon
} from 'lucide-react';
import { teamsApi } from '../lib/api';
import api from '../lib/api';
import type { Team, TeamMember, TeamAnnouncement, TeamContentPost, TeamFile } from '@campus-forum/core';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';
import MarkdownEditor from '../components/MarkdownEditor';

type TabType = 'announcements' | 'posts' | 'files' | 'members';

export default function TeamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const teamId = Number(id);

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [tab, setTab] = useState<TabType>('announcements');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [applications, setApplications] = useState<TeamMember[]>([]);
  const [announcements, setAnnouncements] = useState<TeamAnnouncement[]>([]);
  const [posts, setPosts] = useState<TeamContentPost[]>([]);
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [membersHidden, setMembersHidden] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnPinned, setNewAnnPinned] = useState(false);
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postImages, setPostImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileDeleteLoading, setFileDeleteLoading] = useState<number | null>(null);

  const isOwner = team?.myRole === 'owner';
  const isAdmin = isOwner || team?.myRole === 'admin';
  const isMember = !!team?.myRole;

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamRes, membersRes, annRes, postsRes, filesRes] = await Promise.all([
        teamsApi.getTeam(teamId),
        teamsApi.getTeamMembers(teamId),
        teamsApi.getAnnouncements(teamId),
        teamsApi.getTeamContentPosts(teamId),
        teamsApi.getTeamFiles(teamId),
      ]);
      setTeam(teamRes.data);
      setMembers(membersRes.data.members);
      setMembersHidden(!!membersRes.data.hidden);
      setAnnouncements(annRes.data.announcements);
      setPosts(postsRes.data.posts);
      setFiles(filesRes.data.files);

      if (isOwner || teamRes.data.myRole === 'admin') {
        const appRes = await teamsApi.getTeamApplications(teamId);
        setApplications(appRes.data.applications);
      }
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [teamId]);

  const handleJoin = async () => {
    setActionLoading(true);
    try {
      const res = await teamsApi.joinTeam(teamId);
      toastStore.success(res.data.message);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('确定要退出团队吗？')) return;
    setActionLoading(true);
    try {
      const res = await teamsApi.leaveTeam(teamId);
      toastStore.success(res.data.message);
      navigate('/teams');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      await teamsApi.approveMember(teamId, userId);
      toastStore.success('已批准');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await teamsApi.rejectMember(teamId, userId);
      toastStore.success('已拒绝');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('确定移除该成员吗？')) return;
    try {
      await teamsApi.removeMember(teamId, userId);
      toastStore.success('已移除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleToggleAdmin = async (member: TeamMember) => {
    if (!isOwner) return;
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    try {
      await teamsApi.setMemberRole(teamId, member.user_id, newRole);
      toastStore.success(newRole === 'admin' ? '已设为管理员' : '已取消管理员');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleTransfer = async (newOwnerId: number) => {
    if (!confirm('确定要转让创建者身份吗？转让后你将变为普通成员。')) return;
    try {
      await teamsApi.transferOwnership(teamId, newOwnerId);
      toastStore.success('已转让');
      setShowTransferModal(false);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle.trim()) {
      toastStore.warning('请输入标题');
      return;
    }
    if (!newAnnContent.trim()) {
      toastStore.warning('请输入内容');
      return;
    }
    setAnnSubmitting(true);
    try {
      await teamsApi.createAnnouncement(teamId, {
        title: newAnnTitle.trim(),
        content: newAnnContent.trim(),
        isPinned: newAnnPinned,
      });
      toastStore.success('公告已发布');
      setShowAnnouncementModal(false);
      setNewAnnTitle('');
      setNewAnnContent('');
      setNewAnnPinned(false);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '发布失败');
    } finally {
      setAnnSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: number) => {
    if (!confirm('确定删除该公告吗？')) return;
    try {
      await teamsApi.deleteAnnouncement(teamId, annId);
      toastStore.success('已删除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim()) { toastStore.warning('请输入标题'); return; }
    if (!newPostContent.trim()) { toastStore.warning('请输入内容'); return; }
    setPostSubmitting(true);
    try {
      await teamsApi.createTeamContentPost(teamId, {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        images: postImages.length > 0 ? postImages : undefined,
      });
      toastStore.success('发帖成功！');
      setShowPostModal(false);
      setNewPostTitle('');
      setNewPostContent('');
      setPostImages([]);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '发帖失败');
    } finally {
      setPostSubmitting(false);
    }
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (postImages.length >= 9) { toastStore.warning('最多上传9张图片'); return; }
    if (file.size > 5 * 1024 * 1024) { toastStore.warning('图片不能超过5MB'); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await api.post('/upload', { image: base64, filename: file.name });
          setPostImages(prev => [...prev, res.data.url]);
          toastStore.success('图片上传成功');
        } catch { toastStore.error('图片上传失败'); }
        finally { setUploading(false); }
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); toastStore.error('图片读取失败'); }
  };

  const removePostImage = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteContentPost = async (postId: number) => {
    if (!confirm('确定删除该帖子吗？')) return;
    try {
      await teamsApi.deleteTeamContentPost(teamId, postId);
      toastStore.success('已删除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toastStore.warning('文件不能超过 50MB'); return; }
    setFileUploading(true);
    try {
      // Step 1: 获取 OSS 签名上传 URL
      const urlRes = await teamsApi.getOssUploadUrl(teamId, file.name);
      const { uploadUrl, ossKey } = urlRes.data;

      // Step 2: 直传到 OSS
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('上传到 OSS 失败');

      // Step 3: 保存元数据
      await teamsApi.uploadTeamFile(teamId, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: '', // 不需要 base64
        ossKey,
        size: file.size,
      } as any);
      toastStore.success('上传成功');
      setShowFileUploadModal(false);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || err.message || '上传失败');
    } finally { setFileUploading(false); }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm('确定删除该文件吗？')) return;
    setFileDeleteLoading(fileId);
    try {
      await teamsApi.deleteTeamFile(teamId, fileId);
      toastStore.success('已删除');
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    } finally { setFileDeleteLoading(null); }
  };

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  const handleCopyInvite = async () => {
    if (!team?.invite_code) return;
    try {
      await navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
      toastStore.success('邀请码已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastStore.error('复制失败');
    }
  };

  const handleResetInvite = async () => {
    if (!confirm('确定要重置邀请码吗？重置后原邀请码将失效。')) return;
    try {
      const res = await teamsApi.resetInviteCode(teamId);
      if (team) setTeam({ ...team, invite_code: res.data.inviteCode });
      toastStore.success('邀请码已重置');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await teamsApi.toggleFavorite(teamId);
      if (team) setTeam({ ...team, isFavorited: res.data.favorited });
      toastStore.success(res.data.favorited ? '已收藏' : '已取消收藏');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  const tabs = [
    { key: 'announcements', label: '公告', icon: Megaphone },
    { key: 'posts', label: '帖子', icon: FileText },
    { key: 'files', label: '文件', icon: Upload },
    { key: 'members', label: '成员', icon: Users },
  ];

  if (loading) {
    return <div className="text-center py-16 text-campus-text-secondary">加载中...</div>;
  }

  if (!team) {
    return <div className="text-center py-16 text-campus-text-secondary">团队不存在</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-campus-text-secondary hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
            {team.avatar ? (
              <img src={team.avatar} alt={team.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <Users className="w-10 h-10 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-campus-text-primary font-display">{team.name}</h1>
              {team.is_public === 1 ? (
                <span className="flex items-center gap-1 text-xs text-campus-text-secondary bg-surface-hover px-2 py-1 rounded-full">
                  <Unlock className="w-3 h-3" />
                  公开
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-campus-text-secondary bg-surface-hover px-2 py-1 rounded-full">
                  <Lock className="w-3 h-3" />
                  私密
                </span>
              )}
              {isOwner && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">创建者</span>
              )}
              {team.myRole === 'admin' && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">管理员</span>
              )}
            </div>
            <p className="text-campus-text-secondary mb-4 text-sm line-clamp-2">{team.description || '暂无描述'}</p>
            <div className="flex items-center gap-5 text-sm text-campus-text-tertiary">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {team.member_count}/{team.max_members} 人
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {team.post_count} 帖
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {user && (
              <button
                onClick={handleToggleFavorite}
                className="p-2 rounded-xl border border-border hover:border-primary/30 hover:bg-surface-hover transition-colors"
                title={team.isFavorited ? '取消收藏' : '收藏'}
              >
                <Heart className={`w-5 h-5 ${team.isFavorited ? 'fill-red-500 text-red-500' : 'text-campus-text-secondary'}`} />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => navigate(`/teams/${teamId}/edit`)}
                className="btn-secondary btn-sm btn-inline flex items-center gap-1.5"
              >
                <Settings className="w-4 h-4" />
                管理
              </button>
            )}
            {isMember ? (
              <button
                onClick={handleLeave}
                disabled={actionLoading || isOwner}
                className="btn-secondary btn-sm btn-inline flex items-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {isOwner ? '创建者' : '退出'}
              </button>
            ) : team.myApplicationStatus === 'pending' ? (
              <button disabled className="btn-secondary btn-sm btn-inline opacity-60">
                等待审批
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={actionLoading}
                className="btn-primary btn-sm btn-inline flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {team.is_public === 1 ? '加入团队' : '申请加入'}
              </button>
            )}
          </div>
        </div>
      </div>

      {isAdmin && applications.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-campus-text-primary mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            待审批申请 ({applications.length})
          </h3>
          <div className="space-y-3">
            {applications.map(app => (
              <div key={app.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
                <span className="text-campus-text-primary">{app.display_name || app.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(app.user_id)}
                    className="btn-primary btn-xs btn-inline flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    通过
                  </button>
                  <button
                    onClick={() => handleReject(app.user_id)}
                    className="btn-secondary btn-xs btn-inline flex items-center gap-1 text-destructive"
                  >
                    <X className="w-3.5 h-3.5" />
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-border pb-px">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as TabType)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'text-primary border-primary'
                : 'text-campus-text-secondary border-transparent hover:text-campus-text-primary'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.key === 'announcements' && announcements.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{announcements.length}</span>
            )}
            {t.key === 'posts' && posts.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{posts.length}</span>
            )}
            {t.key === 'members' && !membersHidden && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{members.length}</span>
            )}
          </button>
        ))}
        {isAdmin && tab === 'announcements' && (
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="ml-auto btn-primary btn-sm btn-inline flex items-center gap-1.5 mb-2"
          >
            <Plus className="w-4 h-4" />
            发布公告
          </button>
        )}
        {isAdmin && tab === 'members' && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="ml-auto btn-secondary btn-sm btn-inline flex items-center gap-1.5 mb-2"
          >
            <Copy className="w-4 h-4" />
            邀请码
          </button>
        )}
      </div>

      {tab === 'announcements' && (
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
              <p className="text-campus-text-secondary">暂无公告</p>
            </div>
          ) : (
            announcements.map(ann => (
              <div key={ann.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {ann.is_pinned === 1 && (
                      <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        <Pin className="w-3 h-3" />
                        置顶
                      </span>
                    )}
                    <h4 className="font-semibold text-campus-text-primary">{ann.title}</h4>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="p-1 text-campus-text-tertiary hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-campus-text-secondary text-sm whitespace-pre-wrap mb-3">{ann.content}</p>
                <div className="text-xs text-campus-text-tertiary">
                  {ann.display_name || ann.username} · {new Date(ann.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'posts' && (
        <div className="space-y-3">
          {/* 发帖按钮 */}
          {isMember && (
            <button
              onClick={() => setShowPostModal(true)}
              className="w-full p-4 bg-surface border-2 border-dashed border-border rounded-xl text-campus-text-secondary hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              发表新帖
            </button>
          )}

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
              <p className="text-campus-text-secondary">暂无帖子</p>
              {!isMember && <p className="text-xs text-campus-text-tertiary mt-2">加入团队后可发帖</p>}
            </div>
          ) : (
            posts.map(post => (
              <div
                key={post.id}
                onClick={() => navigate(`/teams/${teamId}/post/${post.id}`)}
                className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-card transition-all"
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-campus-text-primary hover:text-primary transition-colors mb-1">
                    {post.is_pinned === 1 && <Pin className="w-3.5 h-3.5 inline mr-1 text-primary" />}
                    {post.title}
                  </h4>
                  {isAdmin && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDeleteContentPost(post.id);
                      }}
                      className="p-1 text-campus-text-tertiary hover:text-destructive transition-colors flex-shrink-0 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-campus-text-secondary line-clamp-2 mb-2">{post.content}</p>
                <div className="flex items-center gap-3 text-xs text-campus-text-tertiary">
                  <span>{post.display_name || post.username}</span>
                  <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'files' && (
        <div className="space-y-3">
          {isMember && (
            <button
              onClick={() => setShowFileUploadModal(true)}
              className="w-full p-4 bg-surface border-2 border-dashed border-border rounded-xl text-campus-text-secondary hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              上传文件
            </button>
          )}

          {files.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
              <p className="text-campus-text-secondary">暂无文件</p>
              {!isMember && <p className="text-xs text-campus-text-tertiary mt-2">加入团队后可上传文件</p>}
            </div>
          ) : (
            files.map(file => (
              <div key={file.id} className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-campus-text-primary truncate">{file.original_name}</h4>
                  <div className="flex items-center gap-3 text-xs text-campus-text-tertiary mt-0.5">
                    <span>{file.display_name || file.username}</span>
                    <span>{formatFileSize(file.size)}</span>
                    <span>{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <a
                    href={teamsApi.getTeamFileDownloadUrl(teamId, file.id)}
                    download={file.original_name}
                    className="p-2 rounded-lg hover:bg-primary/10 text-campus-text-secondary hover:text-primary transition-colors"
                    title="下载"
                  >
                    <DownloadIcon className="w-5 h-5" />
                  </a>
                  {(isAdmin || file.author_id === user?.id) && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={fileDeleteLoading === file.id}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-campus-text-secondary hover:text-destructive transition-colors"
                      title="删除"
                    >
                      {fileDeleteLoading === file.id ? (
                        <span className="w-5 h-5 block animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'members' && (
        <div>
          {membersHidden ? (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 mx-auto text-campus-text-tertiary mb-3" />
              <p className="text-campus-text-secondary">成员列表仅对团队成员可见</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium text-primary">{(member.display_name || member.username)[0]}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-campus-text-primary font-medium text-sm">
                          {member.display_name || member.username}
                        </span>
                        {member.role === 'owner' && (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        )}
                        {member.role === 'admin' && (
                          <Shield className="w-4 h-4 text-accent" />
                        )}
                      </div>
                      <span className="text-xs text-campus-text-tertiary">
                        {new Date(member.joined_at).toLocaleDateString('zh-CN')} 加入
                      </span>
                    </div>
                  </div>
                  {isOwner && member.role !== 'owner' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAdmin(member)}
                        className="btn-secondary btn-xs btn-inline"
                      >
                        {member.role === 'admin' ? '取消管理员' : '设为管理员'}
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="btn-secondary btn-xs btn-inline text-destructive hover:bg-destructive/10"
                      >
                        移除
                      </button>
                    </div>
                  )}
                  {isAdmin && !isOwner && member.role === 'member' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="btn-secondary btn-xs btn-inline text-destructive hover:bg-destructive/10"
                    >
                      移除
                    </button>
                  )}
                </div>
              ))}
              {isOwner && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="btn-secondary btn-sm btn-inline text-destructive hover:bg-destructive/10"
                  >
                    转让团队
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">转让团队</h3>
            <p className="text-sm text-campus-text-secondary mb-4">选择新的创建者，转让后你将变为普通成员。</p>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {members.filter(m => m.role !== 'owner').map(member => (
                <button
                  key={member.id}
                  onClick={() => handleTransfer(member.user_id)}
                  className="w-full flex items-center gap-3 p-3 bg-surface-hover rounded-xl hover:bg-primary/10 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">{(member.display_name || member.username)[0]}</span>
                  </div>
                  <span className="text-campus-text-primary">{member.display_name || member.username}</span>
                  {member.role === 'admin' && <Shield className="w-4 h-4 text-accent ml-auto" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowTransferModal(false)}
                className="btn-secondary btn-inline text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">发布公告</h3>
            <input
              type="text"
              value={newAnnTitle}
              onChange={e => setNewAnnTitle(e.target.value)}
              placeholder="公告标题"
              maxLength={100}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors mb-3"
            />
            <textarea
              value={newAnnContent}
              onChange={e => setNewAnnContent(e.target.value)}
              placeholder="公告内容"
              maxLength={2000}
              rows={6}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors resize-none mb-3"
            />
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={newAnnPinned}
                onChange={e => setNewAnnPinned(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-campus-text-secondary">置顶公告</span>
            </label>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAnnouncementModal(false); setNewAnnTitle(''); setNewAnnContent(''); setNewAnnPinned(false); }}
                className="btn-secondary btn-inline text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreateAnnouncement}
                disabled={annSubmitting}
                className="btn-primary btn-inline text-sm disabled:opacity-50"
              >
                {annSubmitting ? '发布中...' : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">发表新帖</h3>
            <input
              type="text"
              value={newPostTitle}
              onChange={e => setNewPostTitle(e.target.value)}
              placeholder="帖子标题"
              maxLength={100}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors mb-3"
            />
            <div className="mb-4">
              <MarkdownEditor
                content={newPostContent}
                onChange={setNewPostContent}
                placeholder="写下你的内容..."
                minHeight="min-h-[200px]"
              />
            </div>
            {/* Image upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-campus-text-secondary mb-2">图片 ({postImages.length}/9)</label>
              <div className="flex flex-wrap gap-2">
                {postImages.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePostImage(i)}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-white rounded-full hover:bg-destructive-hover"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {postImages.length < 9 && (
                  <label className="w-20 h-20 flex flex-col items-center justify-center border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <ImagePlus className="w-6 h-6 text-campus-text-tertiary" />
                    <span className="text-xs text-campus-text-tertiary mt-1">{uploading ? '上传中...' : '添加'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePostImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowPostModal(false); setNewPostTitle(''); setNewPostContent(''); setPostImages([]); }}
                className="btn-secondary btn-inline text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreatePost}
                disabled={postSubmitting || uploading}
                className="btn-primary btn-inline text-sm disabled:opacity-50"
              >
                {postSubmitting ? '发布中...' : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFileUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">上传文件</h3>
            <p className="text-sm text-campus-text-secondary mb-4">单个文件最大 50MB</p>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
              <Upload className="w-10 h-10 text-campus-text-tertiary mb-2" />
              <span className="text-sm text-campus-text-secondary">{fileUploading ? '上传中...' : '点击选择文件'}</span>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={fileUploading} />
            </label>
            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={() => setShowFileUploadModal(false)}
                className="btn-secondary btn-inline text-sm"
                disabled={fileUploading}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">邀请码</h3>
            <p className="text-sm text-campus-text-secondary mb-4">分享邀请码给好友，对方可直接加入团队。</p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 px-4 py-3 bg-surface-hover rounded-xl text-campus-text-primary font-mono text-center tracking-wider">
                {team.invite_code}
              </code>
              <button
                onClick={handleCopyInvite}
                className="btn-secondary btn-sm btn-inline flex items-center gap-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleResetInvite}
                className="btn-secondary btn-inline text-sm text-destructive hover:bg-destructive/10"
              >
                重置邀请码
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="btn-primary btn-inline text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
