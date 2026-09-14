// EXPORTS: IAd

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
