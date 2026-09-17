import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Leaf,
  Shield,
  Heart,
  Info,
  MessageSquareText,
  Headphones,
  Plus,
  Loader2,
  Send,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image } from '@/components/ui/image';
import { submitContactMessage } from '@/lib/api';
import { uploadMiscImage } from '@/lib/image';

/** 帮助页深链：跳转后自动展开对应分区并定位到具体条目 */
const helpLink = (section: string, item: string) =>
  `/help?section=${section}&item=${encodeURIComponent(item)}`;

export default function Footer() {
  const { auth } = useApp();
  const navigate = useNavigate();

  // 联系青藤弹窗（复用意见反馈系统，管理员在同一后台收件箱回复）
  const [contactOpen, setContactOpen] = useState(false);
  const [contactText, setContactText] = useState('');
  const [contactImage, setContactImage] = useState<string | null>(null);
  const [contactUploading, setContactUploading] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const contactFileRef = useRef<HTMLInputElement>(null);

  const handleFeedbackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (auth.isLoggedIn) {
      navigate('/profile#feedback');
    } else {
      navigate('/profile');
      toast.info('请先登录后提交意见反馈');
    }
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!auth.isLoggedIn) {
      navigate('/profile');
      toast.info('请先登录后联系青藤');
      return;
    }
    setContactText('');
    setContactImage(null);
    setContactOpen(true);
  };

  // 「晒晒太阳」等入口通过 window 事件唤起联系青藤弹窗并预填内容（detail 为预填文字）
  useEffect(() => {
    const handler = (e: Event) => {
      const prefill = (e as CustomEvent<string>).detail;
      if (!auth.isLoggedIn) {
        navigate('/profile');
        toast.info('请先登录后联系青藤');
        return;
      }
      setContactText(typeof prefill === 'string' ? prefill : '');
      setContactImage(null);
      setContactOpen(true);
    };
    window.addEventListener('qt-open-contact', handler);
    return () => window.removeEventListener('qt-open-contact', handler);
  }, [auth.isLoggedIn, navigate]);

  // 上传截图（选填，限一张）
  const handleContactFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || contactUploading) return;
    setContactUploading(true);
    try {
      const url = await uploadMiscImage(auth.userId, file, 'contact');
      setContactImage(url);
    } catch {
      toast.error('图片上传失败，请稍后重试');
    } finally {
      setContactUploading(false);
    }
  };

  const handleContactSubmit = async () => {
    if (contactBusy || contactUploading) return;
    const text = contactText.trim();
    if (!text) {
      toast.error('请先填写想对青藤说的话');
      return;
    }
    setContactBusy(true);
    const result = await submitContactMessage(
      auth.userId,
      text,
      contactImage ?? undefined,
    );
    setContactBusy(false);
    if (result.success) {
      setContactOpen(false);
      toast.success('已发送，管理员回复后可在「我的-意见反馈」查看');
    } else {
      toast.error(result.message ?? '提交失败，请稍后重试');
    }
  };

  return (
    <footer className="w-full border-t border-border/60 bg-gradient-to-b from-transparent to-primary/5 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-8">
          <div className="col-span-3 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center text-primary-foreground">
                <Leaf className="size-4" />
              </div>
              <span className="font-bold text-foreground">青藤集市</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-xs md:text-sm text-foreground mb-2 md:mb-3 flex items-center gap-1.5">
              <Shield className="size-3.5 md:size-4 text-primary" />
              平台规则
            </h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <NavLink
                  to={helpLink('rules', '交易规则')}
                  className="hover:text-primary transition-colors"
                >
                  交易规则
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('rules', '商品发布规范')}
                  className="hover:text-primary transition-colors"
                >
                  禁止物品
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('safety', '线下自提安全建议')}
                  className="hover:text-primary transition-colors"
                >
                  自提须知
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('disclaimer', '信息交流平台')}
                  className="hover:text-primary transition-colors"
                >
                  免责声明
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-xs md:text-sm text-foreground mb-2 md:mb-3 flex items-center gap-1.5">
              <Info className="size-3.5 md:size-4 text-primary" />
              帮助中心
            </h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <NavLink
                  to={helpLink('guide', '如何发布商品？')}
                  className="hover:text-primary transition-colors"
                >
                  如何发布
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('guide', '如何认证登录？')}
                  className="hover:text-primary transition-colors"
                >
                  认证说明
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('safety', '防诈骗提醒')}
                  className="hover:text-primary transition-colors"
                >
                  防诈骗提示
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-xs md:text-sm text-foreground mb-2 md:mb-3 flex items-center gap-1.5">
              <Heart className="size-3.5 md:size-4 text-primary" />
              关于我们
            </h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <NavLink
                  to={helpLink('about', '关于青藤')}
                  className="hover:text-primary transition-colors"
                >
                  关于青藤
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="#"
                  onClick={handleFeedbackClick}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <MessageSquareText className="size-3.5" />
                  意见反馈
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="#"
                  onClick={handleContactClick}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Headphones className="size-3.5" />
                  联系青藤
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 md:mt-10 pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 青藤集市 Qingteng Market · 校园环保再生计划</p>
          <p className="flex items-center gap-1.5">
            <Leaf className="size-3 text-primary/60" />
            让每一件闲置，都再生长一次
          </p>
        </div>
      </div>

      {/* 联系青藤：直接给管理员留言（进意见反馈收件箱） */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Headphones className="size-4 text-primary" />
              联系青藤
            </DialogTitle>
            <DialogDescription>
              留言会直达管理员，回复可在「我的-意见反馈」查看
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder="想置顶商品？想举报骗子？直接跟我说…"
              maxLength={500}
              rows={4}
            />
            {/* 截图上传（选填，限一张） */}
            <div className="flex items-start gap-3">
              <input
                ref={contactFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleContactFile(e)}
              />
              {contactImage ? (
                <div className="relative">
                  <Image
                    src={contactImage}
                    alt="截图"
                    className="size-20 rounded-lg object-cover border border-border/60"
                  />
                  <button
                    onClick={() => setContactImage(null)}
                    className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center"
                    title="移除截图"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => contactFileRef.current?.click()}
                  disabled={contactUploading}
                  className="size-20 rounded-lg border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {contactUploading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Plus className="size-5" />
                  )}
                  <span className="text-[10px]">
                    {contactUploading ? '上传中' : '添加截图'}
                  </span>
                </button>
              )}
              <p className="flex-1 text-xs text-muted-foreground pt-1">
                截图选填。请勿上传包含个人隐私的截图
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => void handleContactSubmit()}
              disabled={contactBusy || contactUploading}
              className="gap-1.5"
            >
              {contactBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {contactBusy ? '发送中...' : '发送'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
