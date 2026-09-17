import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------
// 通用图片矩形裁剪弹窗（汇水池收款码 / 求购图片共用）
// 用法：选图后生成 objectURL 传给 imageSrc，确认后 onConfirm 拿回裁剪后的 Blob
// aspect 固定裁剪框长宽比（收款码用 1:1，求购图用 4:3），拖动选区即可
// ---------------------------------------------------------------

interface Props {
  open: boolean;
  /** 待裁剪图片的 objectURL（确认或取消后由调用方负责 revoke） */
  imageSrc: string | null;
  /** 裁剪框长宽比，默认 1:1 */
  aspect?: number;
  title?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

/** 按选区像素从原图裁出 JPEG Blob */
async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前浏览器不支持图片裁剪');
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('裁剪失败，请重试'))),
      'image/jpeg',
      0.92,
    );
  });
}

export default function ImageCropDialog({
  open,
  imageSrc,
  aspect = 1,
  title = '裁剪图片',
  description = '拖动图片和选区，框出你想要的部分',
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !areaPixels) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(imageSrc, areaPixels);
      onConfirm(blob);
    } catch {
      // 裁剪失败时调用方无感知，直接按取消处理即可
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Cropper 需要父容器 relative 且有确定高度 */}
        <div className="relative w-full h-72 bg-black/90 rounded-xl overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-muted-foreground shrink-0">缩放</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="缩放"
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            取消
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={busy || !areaPixels}>
            {busy ? '处理中...' : '确认裁剪'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
