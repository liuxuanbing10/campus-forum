import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, BookOpen, Music, Users, GraduationCap, Trophy, Heart, Star } from 'lucide-react';

interface Board {
  id: number;
  name: string;
  description: string;
  icon: string;
  post_count: number;
}

interface Props {
  boards: Board[];
  loading?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  '📢': <MessageCircle className="w-5 h-5" />,
  '📚': <BookOpen className="w-5 h-5" />,
  '🎵': <Music className="w-5 h-5" />,
  '👥': <Users className="w-5 h-5" />,
  '🎓': <GraduationCap className="w-5 h-5" />,
  '🏆': <Trophy className="w-5 h-5" />,
  '❤️': <Heart className="w-5 h-5" />,
  '⭐': <Star className="w-5 h-5" />,
};

const defaultIcon = <MessageCircle className="w-5 h-5" />;

/**
 * 版块侧栏
 */
export default function BoardsPanel({ boards, loading }: Props) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] backdrop-blur-md p-5">
      <h3 className="text-xl font-bold text-[var(--ink)] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--disp)' }}>
        <span className="w-1.5 h-6 bg-[var(--acc)] rounded-full" />
        诸版列阵
      </h3>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 rounded-md bg-[var(--line)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {boards.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/board/${b.id}`}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--line)] transition-colors group"
              >
                <span className="text-[var(--acc)] group-hover:scale-110 transition-transform">
                  {iconMap[b.icon] ?? defaultIcon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium text-[var(--ink)] truncate">
                    {b.name}
                  </div>
                  <div className="text-[12px] text-[var(--soft)] truncate">
                    {b.description}
                  </div>
                </div>
                <span className="text-[12px] text-[var(--soft)] tabular-nums">
                  {b.post_count}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
