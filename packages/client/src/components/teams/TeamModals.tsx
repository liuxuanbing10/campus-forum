import { useState } from 'react';
import { Copy, Check, Shield, Upload, ImagePlus, X } from 'lucide-react';
import { teamsApi } from '../../lib/api';
import api from '../../lib/api';
import type { Team, TeamMember } from '@campus-forum/core';
import { toastStore } from '../../App';
import MarkdownEditor from '../MarkdownEditor';

interface Props {
  showTransferModal: boolean;
  setShowTransferModal: (v: boolean) => void;
  showAnnouncementModal: boolean;
  setShowAnnouncementModal: (v: boolean) => void;
  showPostModal: boolean;
  setShowPostModal: (v: boolean) => void;
  showFileUploadModal: boolean;
  setShowFileUploadModal: (v: boolean) => void;
  showInviteModal: boolean;
  setShowInviteModal: (v: boolean) => void;
  team: Team;
  teamId: number;
  members: TeamMember[];
  loadData: () => Promise<void>;
  setTeam: (team: Team) => void;
}

export default function TeamModals({
  showTransferModal, setShowTransferModal,
  showAnnouncementModal, setShowAnnouncementModal,
  showPostModal, setShowPostModal,
  showFileUploadModal, setShowFileUploadModal,
  showInviteModal, setShowInviteModal,
  team, teamId, members, loadData, setTeam,
}: Props) {
  // Announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPinned, setAnnPinned] = useState(false);
  const [annSubmitting, setAnnSubmitting] = useState(false);

  // Post form state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // File upload state
  const [fileUploading, setFileUploading] = useState(false);

  // Invite state
  const [copied, setCopied] = useState(false);

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
    if (!annTitle.trim()) { toastStore.warning('请输入标题'); return; }
    if (!annContent.trim()) { toastStore.warning('请输入内容'); return; }
    setAnnSubmitting(true);
    try {
      await teamsApi.createAnnouncement(teamId, {
        title: annTitle.trim(),
        content: annContent.trim(),
        isPinned: annPinned,
      });
      toastStore.success('公告已发布');
      setShowAnnouncementModal(false);
      setAnnTitle(''); setAnnContent(''); setAnnPinned(false);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '发布失败');
    } finally { setAnnSubmitting(false); }
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim()) { toastStore.warning('请输入标题'); return; }
    if (!postContent.trim()) { toastStore.warning('请输入内容'); return; }
    setPostSubmitting(true);
    try {
      await teamsApi.createTeamContentPost(teamId, {
        title: postTitle.trim(),
        content: postContent.trim(),
        images: postImages.length > 0 ? postImages : undefined,
      });
      toastStore.success('发帖成功！');
      setShowPostModal(false);
      setPostTitle(''); setPostContent(''); setPostImages([]);
      loadData();
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '发帖失败');
    } finally { setPostSubmitting(false); }
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (postImages.length >= 9) { toastStore.warning('最多上传9张图片'); return; }
    if (file.size > 5 * 1024 * 1024) { toastStore.warning('图片不能超过5MB'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPostImages(prev => [...prev, res.data.url]);
      toastStore.success('图片上传成功');
    } catch { toastStore.error('图片上传失败'); }
    finally { setUploading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toastStore.warning('文件不能超过 50MB'); return; }
    setFileUploading(true);
    try {
      const urlRes = await teamsApi.getOssUploadUrl(teamId, file.name);
      const { uploadUrl, ossKey } = urlRes.data;
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('上传到 OSS 失败');
      await teamsApi.uploadTeamFile(teamId, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: '',
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

  const handleCopyInvite = async () => {
    if (!team.invite_code) return;
    try {
      await navigator.clipboard.writeText(team.invite_code);
      setCopied(true);
      toastStore.success('邀请码已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch { toastStore.error('复制失败'); }
  };

  const handleResetInvite = async () => {
    if (!confirm('确定要重置邀请码吗？重置后原邀请码将失效。')) return;
    try {
      const res = await teamsApi.resetInviteCode(teamId);
      setTeam({ ...team, invite_code: res.data.inviteCode });
      toastStore.success('邀请码已重置');
    } catch (err: any) {
      toastStore.error(err.response?.data?.error || '操作失败');
    }
  };

  return (
    <>
      {/* Transfer Modal */}
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

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">发布公告</h3>
            <input
              type="text"
              value={annTitle}
              onChange={e => setAnnTitle(e.target.value)}
              placeholder="公告标题"
              maxLength={100}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors mb-3"
            />
            <textarea
              value={annContent}
              onChange={e => setAnnContent(e.target.value)}
              placeholder="公告内容"
              maxLength={2000}
              rows={6}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors resize-none mb-3"
            />
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={annPinned}
                onChange={e => setAnnPinned(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-campus-text-secondary">置顶公告</span>
            </label>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAnnouncementModal(false); setAnnTitle(''); setAnnContent(''); setAnnPinned(false); }}
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

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-campus-text-primary mb-4">发表新帖</h3>
            <input
              type="text"
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
              placeholder="帖子标题"
              maxLength={100}
              className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-campus-text-primary placeholder-campus-text-tertiary focus:outline-none focus:border-primary/50 transition-colors mb-3"
            />
            <div className="mb-4">
              <MarkdownEditor
                content={postContent}
                onChange={setPostContent}
                placeholder="写下你的内容..."
                minHeight="min-h-[200px]"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-campus-text-secondary mb-2">图片 ({postImages.length}/9)</label>
              <div className="flex flex-wrap gap-2">
                {postImages.map((img, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPostImages(prev => prev.filter((_, j) => j !== i))}
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
                onClick={() => { setShowPostModal(false); setPostTitle(''); setPostContent(''); setPostImages([]); }}
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

      {/* File Upload Modal */}
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

      {/* Invite Modal */}
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
    </>
  );
}
