import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, MessageCircle, User } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

const tabs = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/search', icon: Search, label: '搜索' },
  { path: '/new', icon: Plus, label: '发帖', isAction: true },
  { path: '/messages', icon: MessageCircle, label: '消息' },
  { path: '/my-posts', icon: User, label: '我的' },
];

export default function BottomNav() {
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          if (tab.isAction) {
            return (
              <Link
                key={tab.path}
                to={user ? tab.path : '/login'}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                  <tab.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 text-campus-text-tertiary font-body">{tab.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="flex flex-col items-center justify-center w-full h-full active:scale-95 transition-transform"
            >
              <tab.icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-campus-text-tertiary'}`} />
              <span className={`text-[10px] mt-0.5 font-body ${active ? 'text-primary' : 'text-campus-text-tertiary'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
