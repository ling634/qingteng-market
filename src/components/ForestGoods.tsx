import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

interface ForestGoodsProps {
  slotKey?: string;
  className?: string;
}

export default function ForestGoods({
  slotKey = 'forest_goods_main',
  className,
}: ForestGoodsProps) {
  const { ads } = useApp();
  const activeAds = ads.filter((a) => a.slot_key === slotKey && a.status === 'active');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (activeAds.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % activeAds.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeAds.length]);

  if (activeAds.length === 0) return null;

  // 广告被停用/删除导致数量变化时，防止索引越界
  const safeIndex = index % activeAds.length;

  const goPrev = () => setIndex((i) => (i - 1 + activeAds.length) % activeAds.length);
  const goNext = () => setIndex((i) => (i + 1) % activeAds.length);

  return (
    <div className={cn('relative rounded-2xl overflow-hidden shadow-sm border border-border/60', className)}>
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-foreground/80 backdrop-blur-sm text-background text-xs font-semibold px-2.5 py-1 rounded-full">
        <Store className="size-3.5" />
        林间好店
      </div>

      <div className="relative aspect-[21/9] md:aspect-[5/2]">
        {activeAds.map((ad, i) => (
          <Image
            key={ad.id}
            src={ad.image_url}
            alt={ad.title}
            className={cn(
              'absolute inset-0 w-full h-full object-cover transition-opacity duration-700',
              i === safeIndex ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />

        {/* caption */}
        <div className="absolute bottom-4 left-4 right-4 text-white z-10">
          <div className="text-lg md:text-xl font-bold drop-shadow-sm">
            {activeAds[safeIndex].title}
          </div>
        </div>

        {/* arrows */}
        {activeAds.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-white/80 backdrop-blur-sm text-foreground hover:bg-white transition-colors flex items-center justify-center shadow-sm"
              aria-label="上一个"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 size-8 rounded-full bg-white/80 backdrop-blur-sm text-foreground hover:bg-white transition-colors flex items-center justify-center shadow-sm"
              aria-label="下一个"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* dots */}
      {activeAds.length > 1 && (
        <div className="absolute bottom-2 right-3 z-10 flex gap-1.5">
          {activeAds.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={cn(
                'size-1.5 rounded-full transition-all',
                i === safeIndex ? 'bg-white w-4' : 'bg-white/50',
              )}
              aria-label={`第${i + 1}个`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
