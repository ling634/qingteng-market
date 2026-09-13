// EXPORTS: IAd, MOCK_ADS

export interface IAd {
  id: string;
  slot_key: string;
  title: string;
  image_url: string;
  link: string;
  start_at: string;
  end_at: string;
  status: 'active' | 'inactive' | 'expired';
}

const AD_PRINT = '/images/ads/print.jpg';
const AD_FRUIT = '/images/ads/fruit.jpg';

export const MOCK_ADS: IAd[] = [
  {
    id: '1',
    slot_key: 'forest_goods_main',
    title: '青藤打印店',
    image_url: AD_PRINT,
    link: '#',
    start_at: '2025-01-01',
    end_at: '2025-12-31',
    status: 'active',
  },
  {
    id: '2',
    slot_key: 'forest_goods_main',
    title: '果园鲜切水果',
    image_url: AD_FRUIT,
    link: '#',
    start_at: '2025-03-01',
    end_at: '2025-09-30',
    status: 'active',
  },
  {
    id: '3',
    slot_key: 'forest_goods_side',
    title: '青松考研机构',
    image_url: AD_PRINT,
    link: '#',
    start_at: '2024-06-01',
    end_at: '2024-12-31',
    status: 'expired',
  },
];
