// EXPORTS: CATEGORIES

export const CATEGORIES = [
  { key: 'all', label: '全部', icon: 'Grid3X3' },
  { key: '教材数码', label: '教材数码', icon: 'BookOpen' },
  { key: '服饰鞋包', label: '服饰鞋包', icon: 'Shirt' },
  { key: '生活用品', label: '生活用品', icon: 'Home' },
  { key: '交通工具', label: '交通工具', icon: 'Bike' },
  { key: '其他', label: '其他', icon: 'MoreHorizontal' },
] as const;

export const CONDITIONS = [
  '全新',
  '几乎全新',
  '轻微使用',
  '明显使用',
] as const;
