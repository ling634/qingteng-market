import { useNavigate } from 'react-router-dom';
import { Heart, Sun, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Image } from '@/components/ui/image';
import { useApp } from '@/context/AppContext';
import { formatPrice, cn } from '@/lib/utils';
import type { IProduct } from '@/data/products';

interface ProductCardProps {
  product: IProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useApp();
  const fav = isFavorite(product.id);

  const handleClick = () => {
    navigate(`/products/${product.id}`);
  };

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <div
      onClick={handleClick}
      className="group bg-card rounded-xl overflow-hidden border border-border/60 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-300 flex flex-col"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Image
          src={product.thumbs[0] || product.images[0]}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.is_top && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
            <Sun className="size-3" />
            向阳位
          </div>
        )}
        <button
          onClick={handleFav}
          className={cn(
            'absolute top-2 right-2 size-8 rounded-full backdrop-blur-sm flex items-center justify-center transition-all',
            fav
              ? 'bg-primary text-white shadow-md'
              : 'bg-black/20 text-white hover:bg-black/40',
          )}
          aria-label="收藏"
        >
          <Heart className={cn('size-4', fav && 'fill-current')} />
        </button>
        {product.status !== 'on_sale' && (
          <div className="absolute inset-0 bg-black/35 flex items-center justify-center z-10">
            <span className="bg-background/95 text-foreground text-xs font-semibold px-2.5 py-1 rounded-full shadow">
              {product.status === 'sold' ? '已售出' : '已下架'}
            </span>
          </div>
        )}
        <Badge
          variant="secondary"
          className="absolute bottom-2 left-2 text-[10px] px-1.5 py-0 bg-background/90 backdrop-blur-sm"
        >
          {product.condition}
        </Badge>
      </div>

      <div className="p-2.5 md:p-3 flex-1 flex flex-col gap-1.5 md:gap-2">
        <h3 className="text-[13px] md:text-sm font-medium text-foreground truncate md:whitespace-normal md:line-clamp-2 leading-snug md:min-h-[2.5rem]">
          {product.title}
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base md:text-lg font-bold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-[11px] md:text-xs text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] md:text-xs text-muted-foreground mt-auto">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            <span className="truncate max-w-[100px]">{product.pickupLocation}</span>
          </span>
          <span className="truncate">{product.sellerNickname}</span>
        </div>
      </div>
    </div>
  );
}
