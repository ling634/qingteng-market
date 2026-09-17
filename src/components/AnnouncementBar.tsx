import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { fetchLatestAnnouncement, type IAnnouncement } from '@/lib/api';

// ---------------------------------------------------------------
// 首页细长公告栏（高约 30px）
// - 数据来自 announcements 表最新一行；内容为空 → 整个组件不渲染
// - 点「×」后 localStorage 记录 { 公告id, 关闭时间 }：
//   同一条公告 5 天内不再显示；管理员修改公告（产生新 id）后重新显示
// ---------------------------------------------------------------

const DISMISS_KEY = 'qt-announce-dismiss';
const DISMISS_TTL_MS = 5 * 24 * 60 * 60 * 1000; // 5 天

/** 读取本地关闭记录：该公告 5 天内已关闭返回 true */
function isDismissed(id: number): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const rec = JSON.parse(raw) as { id?: number; at?: number };
    if (rec.id !== id || typeof rec.at !== 'number') return false;
    return Date.now() - rec.at < DISMISS_TTL_MS;
  } catch {
    return false;
  }
}

export default function AnnouncementBar() {
  const [ann, setAnn] = useState<IAnnouncement | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetchLatestAnnouncement()
      .then((latest) => {
        if (latest && latest.content.trim() && !isDismissed(latest.id)) {
          setAnn(latest);
        }
      })
      .catch(() => {
        // 读取失败静默：不渲染公告栏
      });
  }, []);

  if (!ann || closed) return null;

  const handleClose = () => {
    try {
      localStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ id: ann.id, at: Date.now() }),
      );
    } catch {
      // localStorage 不可用则仅本次隐藏
    }
    setClosed(true);
  };

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="h-[30px] mt-3 flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 text-xs text-amber-800">
          <Megaphone className="size-3.5 shrink-0 text-amber-600" />
          <span className="flex-1 min-w-0 truncate">{ann.content}</span>
          <button
            onClick={handleClose}
            title="关闭公告"
            className="shrink-0 size-5 rounded-full flex items-center justify-center text-amber-700/70 hover:text-amber-800 hover:bg-amber-500/15 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
