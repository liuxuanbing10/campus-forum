import '@testing-library/jest-dom';

import { vi } from 'vitest';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    ({ type: 'a', props: { href: to }, children }),
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('../stores/auth', () => ({
  useAuthStore: () => ({
    user: { id: 1, username: 'testuser', displayName: 'Test User' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  postsApi: {
    create: vi.fn().mockResolvedValue({ data: {} }),
    getStats: vi.fn().mockResolvedValue({ data: {} }),
  },
  messageApi: {
    getConversations: vi.fn().mockResolvedValue({ data: { conversations: [] } }),
    getMessages: vi.fn().mockResolvedValue({ data: { messages: [] } }),
    send: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('../App', () => ({
  toastStore: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('../lib/websocket', () => ({
  wsService: {
    on: vi.fn(),
    off: vi.fn(),
    send: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
}));
