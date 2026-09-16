import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** 取景框显示尺寸（px），输出头像边长 */
const VIEW = 280;
const OUT = 512;

interface Props {
  /** 待裁剪的图片文件；为 null 时不渲染 */
  file: File | null;
  onClose: () => void;
  /** 裁剪完成，输出 512x512 的 JPEG 文件 */
  onConfirm: (file: File) => void;
  busy?: boolean;
}

/**
 * 头像裁剪弹窗：拖动选区 + 滑杆缩放，正方形取景，圆形预览。
 * 纯 canvas 实现，不依赖第三方裁剪库。
 */
export default function AvatarCropDialog({ file, onClose, onConfirm, busy }: Props) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1); // 相对「刚好覆盖取景框」的倍率
  const [pos, setPos] = useState({ x: 0, y: 0 }); // 图片中心相对取景框中心的偏移（显示 px）
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );

  // 文件 → 本地预览 URL
  useEffect(() => {
    if (!file) {
      setImgUrl(null);
      setNatural(null);
      setScale(1);
      setPos({ x: 0, y: 0 });
      return;
    }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setScale(1);
    setPos({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** 当前显示倍率：图片宽 = natural.w * k */
  const k = natural ? (VIEW / Math.min(natural.w, natural.h)) * scale : 1;

  /** 限制拖动范围：图片必须始终盖住整个取景框 */
  const clampPos = useCallback(
    (x: number, y: number) => {
      if (!natural) return { x: 0, y: 0 };
      const maxX = Math.max(0, (natural.w * k - VIEW) / 2);
      const maxY = Math.max(0, (natural.h * k - VIEW) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [natural, k],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pos.x, baseY: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos(clampPos(d.baseX + e.clientX - d.startX, d.baseY + e.clientY - d.startY));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleScale = (v: number) => {
    setScale(v);
    setPos((p) => clampPos(p.x, p.y));
  };

  // 裁剪输出：把取景框对应的源图区域画到 512x512 canvas
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !natural) return;
    const sSize = VIEW / k;
    const sx = (natural.w - sSize) / 2 - pos.x / k;
    const sy = (natural.h - sSize) / 2 - pos.y / k;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>裁剪头像</DialogTitle>
          <DialogDescription>拖动图片选择要显示的部分，可用滑杆缩放</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* 取景框 */}
          <div
            className="relative overflow-hidden rounded-full border-2 border-primary/50 bg-muted touch-none select-none"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {imgUrl && (
              <img
                ref={imgRef}
                src={imgUrl}
                alt=""
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setNatural({ w: img.naturalWidth, h: img.naturalHeight });
                }}
                className="absolute max-w-none"
                style={
                  natural
                    ? {
                        width: natural.w * k,
                        height: natural.h * k,
                        left: VIEW / 2 + pos.x - (natural.w * k) / 2,
                        top: VIEW / 2 + pos.y - (natural.h * k) / 2,
                      }
                    : { opacity: 0 }
                }
              />
            )}
          </div>

          {/* 缩放滑杆 */}
          <div className="w-full flex items-center gap-3 px-2">
            <span className="text-xs text-muted-foreground shrink-0">缩放</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={scale}
              onChange={(e) => handleScale(Number(e.target.value))}
              className="flex-1 accent-[var(--primary)]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={busy || !natural}>
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                上传中...
              </>
            ) : (
              '确认使用'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
