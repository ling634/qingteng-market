import { useRef, useState } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
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
// aspect 传值则锁定长宽比（收款码 1:1）；不传则自由调节矩形长宽（求购图）
// ---------------------------------------------------------------

interface Props {
  open: boolean;
  /** 待裁剪图片的 objectURL（确认或取消后由调用方负责 revoke） */
  imageSrc: string | null;
  /** 锁定裁剪框长宽比；不传则自由调整 */
  aspect?: number;
  title?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

/** 图片加载后给一个居中的默认选区（有 aspect 时按比例） */
function defaultCrop(imgW: number, imgH: number, aspect?: number): Crop {
  const init = aspect
    ? makeAspectCrop({ unit: '%', width: 90 }, aspect, imgW, imgH)
    : { unit: '%' as const, width: 90, height: 90 };
  return centerCrop(init, imgW, imgH);
}

export default function ImageCropDialog({
  open,
  imageSrc,
  aspect,
  title = '裁剪图片',
  description = '拖动选区，框出你想要的部分',
  onCancel,
  onConfirm,
}: Props) {
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  /** 按选区像素从原图裁出 JPEG Blob（显示尺寸 → 原始尺寸换算） */
  const cropToBlob = async (): Promise<Blob> => {
    const img = imgRef.current;
    if (!img || !completed || completed.width < 2 || completed.height < 2) {
      throw new Error('请先框选裁剪区域');
    }
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(completed.width * scaleX);
    canvas.height = Math.round(completed.height * scaleY);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持图片裁剪');
    ctx.drawImage(
      img,
      completed.x * scaleX,
      completed.y * scaleY,
      completed.width * scaleX,
      completed.height * scaleY,
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
  };

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const blob = await cropToBlob();
      onConfirm(blob);
    } catch {
      // 裁剪失败按取消处理
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
        <div className="max-h-80 overflow-auto rounded-xl bg-black/90 flex items-center justify-center">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompleted(c)}
              aspect={aspect}
              className="max-h-80"
            >
              {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="待裁剪图片"
                className="max-h-80 w-auto"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const c = defaultCrop(img.width, img.height, aspect);
                  setCrop(c);
                }}
              />
            </ReactCrop>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            取消
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={busy || !completed}>
            {busy ? '处理中...' : '确认裁剪'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
