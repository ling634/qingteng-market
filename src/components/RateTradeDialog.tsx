import { useEffect, useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { rateTrade, type ITradeRecord } from '@/lib/api';

interface Props {
  /** 待评价的交易；为 null 时弹窗关闭 */
  trade: ITradeRecord | null;
  onClose: () => void;
  /** 评价成功后回调（用于刷新列表） */
  onRated: () => void;
}

const RATING_TEXT = ['', '很不满意', '不满意', '一般', '满意', '非常满意'];

/** 买家评价卖家弹窗：1~5 星 + 评语（可选） */
export default function RateTradeDialog({ trade, onClose, onRated }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (trade) {
      setRating(0);
      setHover(0);
      setComment('');
    }
  }, [trade]);

  const handleSubmit = async () => {
    if (!trade) return;
    if (rating === 0) {
      toast.error('请先选择星级');
      return;
    }
    setSubmitting(true);
    try {
      await rateTrade(trade.id, rating, comment.trim());
      toast.success('评价成功，感谢反馈');
      onClose();
      onRated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '评价失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const shown = hover || rating;

  return (
    <Dialog open={!!trade} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>评价本次交易</DialogTitle>
          <DialogDescription className="line-clamp-1">
            {trade ? `「${trade.productTitle}」` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                className="p-0.5"
                aria-label={`${i} 星`}
              >
                <Star
                  className={cn(
                    'size-8 transition-colors',
                    i <= shown
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-muted-foreground/30',
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground h-5">
            {shown > 0 ? RATING_TEXT[shown] : '点击星星评分'}
          </p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="补充说说这次交易体验（可选）"
            rows={3}
            maxLength={500}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                提交中...
              </>
            ) : (
              '提交评价'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
