// 查询 Supabase Storage 最近上传的图片及大小（只读，用 anon key）
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function listRecursive(bucket, prefix = '') {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error) return [];
  const files = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id) {
      // 文件
      files.push({
        bucket,
        path,
        createdAt: item.created_at,
        size: item.metadata?.size ?? null,
      });
    } else {
      // 文件夹（用户目录）
      files.push(...(await listRecursive(bucket, path)));
    }
  }
  return files;
}

const all = [
  ...(await listRecursive('product-images')),
  ...(await listRecursive('avatars')),
]
  .filter((f) => f.size != null)
  .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

console.log(`共扫描到 ${all.length} 个文件，最近 5 张：\n`);
for (const f of all.slice(0, 5)) {
  const kb = (f.size / 1024).toFixed(1);
  console.log(`${f.createdAt}  [${f.bucket}]  ${f.path}`);
  console.log(`   上传后（压缩后）大小: ${kb} KB\n`);
}
