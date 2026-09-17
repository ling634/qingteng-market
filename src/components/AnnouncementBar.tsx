import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchLatestAnnouncement, type IAnnouncement } from '@/lib/api';

// ---------------------------------------------------------------
// 首页细长公告栏（高约 30px）
// - 数据来自 announcements 表最新一行；内容为空 → 整个组件不渲染
// - 绝对定位悬浮在 Hero 与分类区之间的既有间距里，不占额外页面高度
// - 点击公告文本 → 弹窗查看完整内容；点「×」→ localStorage 记录
//   { 公告id, 关闭时间 }，同一条公告 5 天内不再显示；
//   管理员修改公告（产生新 id）后重新显示
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
  const [detailOpen, setDetailOpen] = useState(false);

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
    <>
      {/* 悬浮条：定位于 Hero 下沿的既有间距内（Hero section 需为 relative 且无 overflow 裁剪） */}
      <div className="absolute top-full left-0 right-0 z-10 mt-1.5 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="h-[30px] flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 backdrop-blur-sm px-3 text-xs text-amber-800 shadow-sm pointer-events-auto">
            <Megaphone className="size-3.5 shrink-0 text-amber-600" />
            <button
              onClick={() => setDetailOpen(true)}
              className="flex-1 min-w-0 truncate text-left hover:text-amber-900 transition-colors"
              title="查看完整公告"
            >
              {ann.content}
            </button>
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

      {/* 完整公告内容 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Megaphone className="size-4 text-amber-600" />
              平台公告
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {ann.content}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
