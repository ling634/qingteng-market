import { Star } from 'lucide-react';

interface Props {
  /** 0~5 的分数，支持小数（按比例填充星星） */
  value: number;
  className?: string;
}

/** 分数星级展示：平均分是多少，星星就填多少（含半星等任意比例） */
export default function StarRating({ value, className = 'size-4' }: Props) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.min(1, Math.max(0, value - (i - 1)));
        return (
          <span key={i} className={`relative ${className}`}>
            <Star className="absolute inset-0 size-full text-muted-foreground/30" />
            <span
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className="size-full text-amber-500 fill-amber-500" />
            </span>
          </span>
        );
      })}
    </span>
  );
}
