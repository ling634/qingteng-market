import { supabase } from '@/lib/supabase';

const FULL_MAX_SIZE = 1200; // 大图最长边
const THUMB_MAX_SIZE = 400; // 列表缩略图最长边
const TARGET_BYTES = 300 * 1024; // 压缩目标 300KB
const FALLBACK_MAX_BYTES = 3 * 1024 * 1024; // 降级原图上限 3MB

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

function drawToBlob(
  img: HTMLImageElement,
  maxSize: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let { width, height } = img;
    if (width > height && width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('canvas not supported'));
      return;
    }
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      quality,
    );
  });
}

/**
 * 压缩图片：最长边 ≤1200px，质量从 0.75 起逐步降低直到 ≤300KB。
 * 压缩失败时降级为原图（但不得超过 3MB）。
 */
export async function compressImage(
  file: File,
  maxSize = FULL_MAX_SIZE,
): Promise<Blob> {
  try {
    const img = await loadImage(file);
    let quality = 0.75;
    let blob = await drawToBlob(img, maxSize, quality);
    while (blob.size > TARGET_BYTES && quality > 0.4) {
      quality -= 0.1;
      blob = await drawToBlob(img, maxSize, quality);
    }
    return blob;
  } catch {
    if (file.size <= FALLBACK_MAX_BYTES) return file;
    throw new Error('图片过大且压缩失败，请换一张试试');
  }
}

/** 生成 ≤400px 列表缩略图 */
export async function makeThumbnail(file: File): Promise<Blob> {
  const img = await loadImage(file);
  return drawToBlob(img, THUMB_MAX_SIZE, 0.72);
}

async function uploadBlob(
  bucket: string,
  path: string,
  blob: Blob,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`图片上传失败：${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** 上传一组商品图片（大图 + 缩略图），返回 URL 数组 */
export async function uploadProductImages(
  userId: string,
  items: { full: Blob; thumb: Blob }[],
): Promise<{ images: string[]; thumbs: string[] }> {
  const images: string[] = [];
  const thumbs: string[] = [];
  for (const item of items) {
    const key = `${userId}/${crypto.randomUUID()}`;
    images.push(await uploadBlob('product-images', `${key}.jpg`, item.full));
    thumbs.push(
      await uploadBlob('product-images', `${key}_thumb.jpg`, item.thumb),
    );
  }
  return { images, thumbs };
}

/** 上传头像（压缩到 400px），返回 URL */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const blob = await compressImage(file, 400);
  return uploadBlob('avatars', `${userId}/avatar_${Date.now()}.jpg`, blob);
}

/** 上传单张杂图（反馈截图 / 广告图，存 product-images bucket 用户目录下） */
export async function uploadMiscImage(
  userId: string,
  file: File,
  prefix: string,
): Promise<string> {
  const blob = await compressImage(file, FULL_MAX_SIZE);
  return uploadBlob(
    'product-images',
    `${userId}/${prefix}_${crypto.randomUUID()}.jpg`,
    blob,
  );
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] || 'image/jpeg';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
