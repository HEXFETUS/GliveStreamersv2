export interface StreamCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStreamCategoryInput {
  slug?: string;
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateStreamCategoryInput {
  slug?: string;
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}
