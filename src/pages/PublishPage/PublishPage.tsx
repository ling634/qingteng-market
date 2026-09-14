import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  ArrowLeft,
  ImagePlus,
  MapPin,
  X,
  CheckCircle,
  Camera,
  Images,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { CONDITIONS, CATEGORIES } from '@/data/categories';
import { toast } from 'sonner';
import { Image } from '@/components/ui/image';
import { compressImage, makeThumbnail, uploadProductImages } from '@/lib/image';
import { insertProduct } from '@/lib/api';

const publishSchema = z.object({
  category: z.string().min(1, '请选择商品分类'),
  title: z.string().min(2, '商品名称至少 2 个字符').max(50, '商品名称不超过 50 个字符'),
  price: z.string().refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 99999, {
    message: '请输入有效的价格（0-99999）',
  }),
  originalPrice: z
    .string()
    .optional()
    .refine((v) => v === '' || v === undefined || (!isNaN(Number(v)) && Number(v) >= 0), {
      message: '请输入有效的原价',
    }),
  condition: z.enum(CONDITIONS, { message: '请选择商品成色' }),
  pickupLocation: z.string().min(2, '请填写自提地点'),
  description: z.string().max(500, '描述不超过 500 字').optional(),
});

type PublishFormData = z.infer<typeof publishSchema>;

const MAX_IMAGES = 6;

interface PendingImage {
  full: Blob;
  thumb: Blob;
  preview: string;
}

export default function PublishPage() {
  const navigate = useNavigate();
  const { auth } = useApp();
  const [images, setImages] = useState<PendingImage[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PublishFormData>({
    resolver: zodResolver(publishSchema),
    defaultValues: {
      category: '',
      title: '',
      price: '',
      originalPrice: '',
      condition: '轻微使用',
      pickupLocation: '',
      description: '',
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    setCompressing(true);
    try {
      const processed = await Promise.all(
        toAdd.map(async (f) => {
          const full = await compressImage(f);
          const thumb = await makeThumbnail(f);
          return { full, thumb, preview: URL.createObjectURL(full) };
        }),
      );
      setImages((prev) => [...prev, ...processed]);
      toast.success(`已添加 ${processed.length} 张图片`);
    } catch {
      toast.error('图片处理失败，请换一张试试');
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const onSubmit = async (values: PublishFormData) => {
    if (images.length === 0) {
      toast.error('请至少上传一张商品图片');
      return;
    }
    if (!auth.isLoggedIn) {
      toast.error('请先登录后再发布商品');
      navigate('/profile');
      return;
    }
    setSubmitting(true);
    try {
      setUploadProgress(`正在上传图片（共 ${images.length} 张）...`);
      const { images: imageUrls, thumbs } = await uploadProductImages(
        auth.userId,
        images.map((i) => ({ full: i.full, thumb: i.thumb })),
      );
      setUploadProgress('正在发布...');
      await insertProduct(auth.userId, {
        category: values.category,
        title: values.title,
        price: Number(values.price),
        originalPrice: values.originalPrice ? Number(values.originalPrice) : undefined,
        condition: values.condition,
        images: imageUrls,
        thumbs,
        description: values.description || '',
        pickupLocation: values.pickupLocation,
      });
      setSuccessOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* 顶部栏 */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-12 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="size-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-base font-semibold">发布闲置</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-4 md:px-6 py-6"
      >
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 md:p-7">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 图片上传 */}
              <div>
                <FormLabel className="text-sm font-medium">
                  商品图片 <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    最多 {MAX_IMAGES} 张，首张为封面
                  </span>
                </FormLabel>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted border border-border/60 group"
                    >
                      <Image src={img.preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="!absolute top-1 right-1 z-10 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                        aria-label="删除图片"
                      >
                        <X className="size-3" />
                      </button>
                      {i === 0 && (
                        <div className="absolute bottom-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                          封面
                        </div>
                      )}
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors">
                      <Images className="size-5 mb-0.5" />
                      <span className="text-[11px] mb-1">添加图片</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                          aria-label="拍照"
                          title="拍照"
                        >
                          <Camera className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                          aria-label="从相册选择"
                          title="相册"
                        >
                          <ImagePlus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <Camera className="size-3" />
                  支持相机拍照与相册多选，图片将自动压缩保存
                </p>
              </div>

              {/* 分类 + 成色 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        商品分类 <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择分类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                            <SelectItem key={cat.key} value={cat.key}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        商品成色 <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择成色" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CONDITIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 名称 */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      商品名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="例如：高等数学教材（同济第七版）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 价格 + 原价 */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        售价（元） <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        原价（元）
                        <span className="text-xs text-muted-foreground ml-1 font-normal">
                          可选
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="选填"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 自提地点 */}
              <FormField
                control={form.control}
                name="pickupLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      自提地点 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="如：东区12号楼宿舍楼下"
                          className="pl-9"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 描述 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>商品描述（备注）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="描述一下商品的使用情况、购买时间、转手原因等"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 发布说明 */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">发布须知</p>
                  <p className="text-foreground/70 text-xs mt-0.5 leading-relaxed">
                    请确保物品合法合规，禁止发布违禁品。交易通过站内私信沟通，线下自提。
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={submitting || compressing || images.length === 0}>
                {compressing ? '图片处理中...' : submitting ? uploadProgress || '发布中...' : '立即发布'}
              </Button>
            </form>
          </Form>
        </div>
      </motion.div>

      {/* 成功弹窗 */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">发布成功！</DialogTitle>
            <DialogDescription className="text-center">
              你的商品已上架到青藤集市
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle className="size-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              可以在「我的」→「我的在售」中查看和管理
            </p>
          </div>
          <DialogFooter className="flex-row gap-2 sm:gap-0">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setSuccessOpen(false);
                navigate('/profile');
              }}
            >
              查看我的在售
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setSuccessOpen(false);
                navigate('/products');
              }}
            >
              逛逛集市
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
