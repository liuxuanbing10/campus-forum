import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Megaphone, FileText, Upload, Plus, Copy } from 'lucide-react';
import { teamsApi } from '../lib/api';
import type { Team, TeamMember, TeamAnnouncement, TeamContentPost, TeamFile } from '@campus-forum/core';
import { toastStore } from '../App';
import { useAuthStore } from '../stores/auth';
import Skeleton from '../components/Skeleton';
import TeamHeader from '../components/teams/TeamHeader';
import PendingApplications from '../components/teams/PendingApplications';
import AnnouncementsTab from '../components/teams/AnnouncementsTab';
import PostsTab from '../components/teams/PostsTab';
import FilesTab from '../components/teams/FilesTab';
import MembersTab from '../components/teams/MembersTab';
import TeamModals from '../components/teams/TeamModals';

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
  const [postSearch, setPostSearch] = useState('');
  const [postSort, setPostSort] = useState<'newest' | 'oldest'>('newest');
  const [files, setFiles] = useState<TeamFile[]>([]);
  const [membersHidden, setMembersHidden] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);

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

  useEffect(() => { loadData(); }, [teamId]);

  const tabs = [
    { key: 'announcements', label: '公告', icon: Megaphone },
    { key: 'posts', label: '帖子', icon: FileText },
    { key: 'files', label: '文件', icon: Upload },
    { key: 'members', label: '成员', icon: Users },
  ];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Skeleton variant="text" count={1} className="h-8 w-1/3" />
        <Skeleton variant="list" count={5} />
      </div>
    );
  }

  if (!team) {
    return <div className="text-center py-16 text-campus-text-secondary">团队不存在</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <TeamHeader
        team={team}
        user={user}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isMember={isMember}
        actionLoading={actionLoading}
        teamId={teamId}
        loadData={loadData}
        setTeam={setTeam}
        setActionLoading={setActionLoading}
        navigate={navigate}
      />

      {isAdmin && applications.length > 0 && (
        <PendingApplications teamId={teamId} applications={applications} loadData={loadData} />
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
        <AnnouncementsTab announcements={announcements} isAdmin={isAdmin} teamId={teamId} loadData={loadData} />
      )}

      {tab === 'posts' && (
        <PostsTab
          posts={posts}
          postSearch={postSearch}
          postSort={postSort}
          setPostSearch={setPostSearch}
          setPostSort={setPostSort}
          isMember={isMember}
          isAdmin={isAdmin}
          teamId={teamId}
          loadData={loadData}
          navigate={navigate}
          setShowPostModal={setShowPostModal}
        />
      )}

      {tab === 'files' && (
        <FilesTab
          files={files}
          isMember={isMember}
          isAdmin={isAdmin}
          user={user}
          teamId={teamId}
          loadData={loadData}
          setShowFileUploadModal={setShowFileUploadModal}
        />
      )}

      {tab === 'members' && (
        <MembersTab
          members={members}
          membersHidden={membersHidden}
          isOwner={isOwner}
          isAdmin={isAdmin}
          teamId={teamId}
          loadData={loadData}
          setShowTransferModal={setShowTransferModal}
        />
      )}

      <TeamModals
        showTransferModal={showTransferModal}
        setShowTransferModal={setShowTransferModal}
        showAnnouncementModal={showAnnouncementModal}
        setShowAnnouncementModal={setShowAnnouncementModal}
        showPostModal={showPostModal}
        setShowPostModal={setShowPostModal}
        showFileUploadModal={showFileUploadModal}
        setShowFileUploadModal={setShowFileUploadModal}
        showInviteModal={showInviteModal}
        setShowInviteModal={setShowInviteModal}
        team={team}
        teamId={teamId}
        members={members}
        loadData={loadData}
        setTeam={setTeam}
      />
    </div>
  );
}
