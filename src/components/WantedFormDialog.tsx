// ---------------------------------------------------------------
// 求购发布/编辑共用表单弹窗：
//   - WantedPage「发布求购」（initial 为空 → 发布模式）
//   - WantedPage 详情弹窗 / ProfilePage「我的求购」的「编辑」（传 initial → 编辑模式）
// 表单内含：分类/标题/预算/描述、配图（选图→自由裁剪→立即上传）、敏感词即时提示+提交兜底。
// onSubmit 由父组件决定是 insertWanted 还是 updateWanted（含 toast 与刷新）。
// ---------------------------------------------------------------

import { useEffect, useState } from 'react';
import { ImagePlus, Loader2, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ImageCropDialog from '@/components/ImageCropDialog';
import { Image } from '@/components/ui/image';
import { uploadMiscImage } from '@/lib/image';
import { useApp } from '@/context/AppContext';
import { CATEGORIES } from '@/data/categories';
import { findSensitiveWordIn } from '@/lib/sensitive-words';
import { toast } from 'sonner';
import type { IWanted } from '@/data/wanted';

export interface WantedFormPayload {
  title: string;
  category: string;
  budget: string;
  description: string;
  image: string | null;
}

interface WantedFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入即为编辑模式（表单预填该求购内容）；不传为发布模式 */
  initial?: IWanted | null;
  /** 父组件执行写库（insert/update），抛错则组件保持打开 */
  onSubmit: (payload: WantedFormPayload) => Promise<void>;
}

export default function WantedFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: WantedFormDialogProps) {
  const { auth } = useApp();
  const editing = !!initial;

  const [formCat, setFormCat] = useState('教材数码');
  const [formTitle, setFormTitle] = useState('');
  const [formBudget, setFormBudget] = useState('');
  const [formDesc, setFormDesc] = useState('');
  // 求购配图（选填一张）：选图→裁剪→立即上传，表单里只存最终 URL
  const [formImage, setFormImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 打开时按模式初始化表单
  useEffect(() => {
    if (!open) return;
    setFormCat(initial?.category ?? '教材数码');
    setFormTitle(initial?.title ?? '');
    setFormBudget(initial?.budget ?? '');
    setFormDesc(initial?.description ?? '');
    setFormImage(initial?.image ?? null);
    setCropSrc(null);
  }, [open, initial]);

  // 敏感词即时提示：命中即在弹窗内标红并禁用提交（提交时再兜底校验一次）
  const sensitiveHit = findSensitiveWordIn(formTitle, formDesc);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || imgUploading) return;
    setCropSrc(URL.createObjectURL(file));
  };

  // 裁剪确认 → 立即上传，表单只保留 URL
  const handleCropConfirm = async (blob: Blob) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setImgUploading(true);
    try {
      const file = new File([blob], 'wanted.jpg', { type: 'image/jpeg' });
      const url = await uploadMiscImage(auth.userId, file, 'wanted');
      setFormImage(url);
    } catch {
      toast.error('图片上传失败，请重试');
    } finally {
      setImgUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formBudget.trim()) {
      toast.error('请填写完整信息');
      return;
    }
    // 敏感词兜底拦截（正常情况即时提示已拦住）
    const hit = findSensitiveWordIn(formTitle, formDesc);
    if (hit) {
      toast.error(`内容包含违规词「${hit}」，请修改后再${editing ? '保存' : '发布'}`);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        title: formTitle.trim(),
        category: formCat,
        budget: formBudget.trim(),
        description: formDesc.trim(),
        image: formImage,
      });
      onOpenChange(false);
    } catch {
      toast.error(editing ? '保存失败，请稍后重试' : '发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '编辑求购' : '发布求购'}</DialogTitle>
            <DialogDescription>
              {editing ? '修改求购内容，保存后立即生效' : '写下你需要的物品，让卖家主动联系你'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                物品分类 <span className="text-destructive">*</span>
              </label>
              <Select value={formCat} onValueChange={setFormCat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                求购标题 <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="如：收一本高等数学教材"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                预算范围 <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="如：10-30元"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">详细描述</label>
              <Textarea
                placeholder="描述你需要的物品细节、成色要求、自提范围等"
                rows={3}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
            {/* 求购配图（选填一张，可裁剪）：帮卖家理解你想要什么样的 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                求购图片
                <span className="text-xs text-muted-foreground ml-1 font-normal">
                  选填，可框选裁剪
                </span>
              </label>
              {formImage ? (
                <div className="relative w-28">
                  <Image
                    src={formImage}
                    alt="求购图片"
                    className="w-28 h-28 object-cover rounded-lg border border-border/60"
                  />
                  <button
                    type="button"
                    onClick={() => setFormImage(null)}
                    className="!absolute -top-1.5 -right-1.5 z-10 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="移除图片"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <label className="block w-28 cursor-pointer">
                  <div className="w-28 h-28 rounded-lg border-2 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors">
                    {imgUploading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <ImagePlus className="size-5" />
                    )}
                    <span className="text-[11px]">
                      {imgUploading ? '上传中' : '添加图片'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFile}
                    disabled={imgUploading}
                  />
                </label>
              )}
            </div>
            {/* 敏感词即时提示（命中时禁用提交） */}
            {sensitiveHit && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2.5">
                <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  内容包含违规词「{sensitiveHit}」，请修改后再{editing ? '保存' : '发布'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting || !!sensitiveHit}>
              {submitting ? '提交中...' : editing ? '保存' : '立即发布'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 求购配图裁剪（自由矩形，不锁长宽比） */}
      <ImageCropDialog
        open={!!cropSrc}
        imageSrc={cropSrc}
        title="裁剪求购图片"
        description="拖动框选出想展示的区域，长宽可自由调节"
        onCancel={() => {
          if (cropSrc) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
        onConfirm={(blob) => void handleCropConfirm(blob)}
      />
    </>
  );
}
