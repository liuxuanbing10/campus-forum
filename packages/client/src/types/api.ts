// ── API 响应类型：core snake_case → camelCase 自动映射 ──
// preSerialization 钩子已将 API 响应统一为 camelCase，
// 此文件通过 CamelKeys<T> 将 core 类型（DB 契约）转为客户端类型（API 契约）。

import type * as Core from '@campus-forum/core';

// ── 递归键转换工具 ──
type CamelCase<S extends string> = S extends `${infer P}_${infer Q}`
  ? `${P}${Capitalize<CamelCase<Q>>}`
  : S;

export type CamelKeys<T> = T extends (infer U)[]
  ? CamelKeys<U>[]
  : T extends object
    ? { [K in keyof T as CamelCase<K & string>]: CamelKeys<T[K]> }
    : T;

// ── 用户 ──
export type User = CamelKeys<Core.User>;
export type UserProfile = CamelKeys<Core.UserProfile>;
export type UserPost = CamelKeys<Core.UserPost>;
export type UserComment = CamelKeys<Core.UserComment>;
export type OAuthAccount = CamelKeys<Core.OAuthAccount>;
export type UserDevice = CamelKeys<Core.UserDevice>;

// ── 帖子 ──
export type Post = CamelKeys<Core.Post>;
export type SearchResult = CamelKeys<Core.SearchResult>;
export type PostStats = CamelKeys<Core.PostStats>;
export type ShareInfo = CamelKeys<Core.ShareInfo>;
export type PostVersion = CamelKeys<Core.PostVersion>;

// ── 团队 ──
export type Team = CamelKeys<Core.Team>;
export type TeamCategory = CamelKeys<Core.TeamCategory>;
export type TeamMember = CamelKeys<Core.TeamMember>;
export type TeamAnnouncement = CamelKeys<Core.TeamAnnouncement>;
export type TeamPost = CamelKeys<Core.TeamPost>;
export type TeamContentPost = CamelKeys<Core.TeamContentPost>;
export type TeamContentComment = CamelKeys<Core.TeamContentComment>;
export type TeamFile = CamelKeys<Core.TeamFile>;
export type MyTeamsResponse = CamelKeys<Core.MyTeamsResponse>;

// ── 社交 ──
export type Conversation = CamelKeys<Core.Conversation>;
export type Message = CamelKeys<Core.Message>;
export type Notification = CamelKeys<Core.Notification>;
export type ReportData = CamelKeys<Core.ReportData>;

// ── 管理 ──
export type AdminUser = CamelKeys<Core.AdminUser>;
export type PendingPost = CamelKeys<Core.PendingPost>;
export type SensitiveWord = CamelKeys<Core.SensitiveWord>;
export type AdminReport = CamelKeys<Core.AdminReport>;
export type AuditLog = CamelKeys<Core.AuditLog>;
export type AdminStats = CamelKeys<Core.AdminStats>;
export type DeviceBlacklistEntry = CamelKeys<Core.DeviceBlacklistEntry>;

// ── 成就 ──
export type Achievement = CamelKeys<Core.Achievement>;

// ── 请求体（客户端 → API，已是 camelCase，直接透传）──
export type { UpdateProfileData, ChangePasswordData, CreateTeamData, UpdateTeamData } from '@campus-forum/core';
export type { CaptchaData } from '@campus-forum/core';
