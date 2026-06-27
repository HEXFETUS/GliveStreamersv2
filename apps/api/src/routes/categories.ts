import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { supabase } from '../lib/supabase.js';

const router: RouterType = Router();

const categorySelect =
  'id, slug, name, description, sort_order, is_active, created_at, updated_at';

const categorySchema = z.object({
  slug: z.string().min(1).max(80).optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional().default(''),
  sort_order: z.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

const updateCategorySchema = categorySchema.partial();

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

router.get('/', async (_req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('stream_categories')
      .select(categorySelect)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
      return;
    }

    res.json({ categories });
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, validate(categorySchema), async (req, res) => {
  try {
    const slug = slugify(req.body.slug || req.body.name);
    if (!slug) {
      res.status(400).json({ error: 'Category slug is required' });
      return;
    }

    const { data: category, error } = await supabase
      .from('stream_categories')
      .insert({
        slug,
        name: req.body.name,
        description: req.body.description,
        sort_order: req.body.sort_order,
        is_active: req.body.is_active,
      })
      .select(categorySelect)
      .single();

    if (error) {
      res.status(409).json({ error: 'Category already exists' });
      return;
    }

    res.status(201).json({ category });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch(
  '/:categoryId',
  authenticate,
  validate(updateCategorySchema),
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const updates: Record<string, unknown> = {};

      for (const field of ['name', 'description', 'sort_order', 'is_active']) {
        if (field in req.body) {
          updates[field] = req.body[field];
        }
      }

      if ('slug' in req.body) {
        updates.slug = slugify(req.body.slug);
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No category fields provided' });
        return;
      }

      const { data: category, error } = await supabase
        .from('stream_categories')
        .update(updates)
        .eq('id', categoryId)
        .select(categorySelect)
        .single();

      if (error || !category) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      res.json({ category });
    } catch (err) {
      console.error('Update category error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
