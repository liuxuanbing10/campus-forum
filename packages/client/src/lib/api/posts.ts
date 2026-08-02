import api from './client';
import type { Post, SearchResult, PostStats, ShareInfo, PostVersion } from '../../types/api';

export const searchApi = {
  search: (q: string, page?: number, boardId?: number) =>
    api.get<{ posts: SearchResult[]; page: number; limit: number; total: number }>('/search', { params: { q, page, boardId } }),
  suggest: (q: string) =>
    api.get<{ suggestions: string[] }>('/search/suggest', { params: { q } }),
};

export const postsApi = {
  getPost: (id: number) => api.get<Post>(`/posts/${id}`),
  updatePost: (id: number, data: { title: string; content: string; boardId: number; isAnonymous?: boolean; isPrivate?: boolean; images?: string[] }) =>
    api.put(`/posts/${id}`, data),
  getStats: (id: number) => api.get<PostStats>(`/posts/${id}/stats`),
  getShareInfo: (id: number) => api.get<ShareInfo>(`/posts/${id}/share`),
  togglePin: (id: number) => api.put<{ success: boolean; isPinned: boolean; message: string }>(`/posts/${id}/pin`),
  togglePrivacy: (id: number) => api.put<{ success: boolean; isPrivate: boolean; message: string }>(`/posts/${id}/privacy`),
  uploadImage: (image: string, filename?: string) =>
    api.post<{ success: boolean; url: string; filename: string }>('/upload', { image, filename }),
  uploadFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ success: boolean; url: string; thumbUrl?: string; filename: string; width?: number; height?: number }>(
      '/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },
};

export const favoritesApi = {
  getFavorites: (page?: number) =>
    api.get<{ posts: Post[]; page: number; limit: number }>('/favorites', { params: { page } }),
  toggleFavorite: (postId: number) => api.post('/favorites', { postId }),
};

export const versionApi = {
  getVersions: (postId: number) => api.get<{ versions: PostVersion[] }>(`/posts/${postId}/versions`),
};

export const commentApi = {
  update: (commentId: number, content: string) => api.put<{ success: boolean }>(`/comments/${commentId}`, { content }),
};
