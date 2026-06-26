/**
 * @drikon/shared-types
 *
 * Single source of truth for data shapes shared between web and api.
 * Both sides import the same Zod schemas → the frontend form validation
 * is provably identical to the backend's accepted payload.
 */
import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────────────────────────────────

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password too long')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/\d/, 'Must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain a symbol');

export const RegisterSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
  twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// ────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ────────────────────────────────────────────────────────────────────────────

export const ProductQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(20),
  search: z.string().max(120).optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
  sort: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular', 'rating'])
    .default('newest'),
});
export type ProductQuery = z.infer<typeof ProductQuerySchema>;

// ────────────────────────────────────────────────────────────────────────────
// API RESPONSE ENVELOPE
// ────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string | object;
    stack?: string;
  };
  requestId?: string;
  timestamp: string;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ────────────────────────────────────────────────────────────────────────────
// DOMAIN TYPES
// ────────────────────────────────────────────────────────────────────────────

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  price: string | number;
  compareAtPrice?: string | number | null;
  currency: string;
  stock: number;
  averageRating: number;
  reviewCount: number;
  isFeatured: boolean;
  images: { url: string; alt?: string | null }[];
  category: { id: string; name: string; slug: string };
  brand?: { id: string; name: string; slug: string } | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProductListResponse {
  items: ProductSummary[];
  pagination: Pagination;
}

// ────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ────────────────────────────────────────────────────────────────────────────

export const CreateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Pick a rating').max(5),
  title: z.string().max(120).trim().optional(),
  body: z.string().max(2000).trim().optional(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export interface ReviewSummary {
  id: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  isVerified: boolean;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
}

export interface ReviewListResponse {
  items: ReviewSummary[];
  averageRating: number;
  reviewCount: number;
  /** Count of reviews at each star level, index 0 = 1★ … index 4 = 5★. */
  distribution: [number, number, number, number, number];
}

// ────────────────────────────────────────────────────────────────────────────
// WISHLIST
// ────────────────────────────────────────────────────────────────────────────

export interface WishlistEntry {
  id: string;
  productId: string;
  createdAt: string;
  product: ProductSummary;
}

// ────────────────────────────────────────────────────────────────────────────
// ORDERS & CHECKOUT
// ────────────────────────────────────────────────────────────────────────────

export const ShippingAddressSchema = z.object({
  fullName: z.string().min(2, 'Required').max(120).trim(),
  phone: z.string().min(5, 'Required').max(30).trim(),
  line1: z.string().min(2, 'Required').max(200).trim(),
  line2: z.string().max(200).trim().optional(),
  city: z.string().min(1, 'Required').max(120).trim(),
  state: z.string().max(120).trim().optional(),
  postalCode: z.string().min(1, 'Required').max(20).trim(),
  country: z.string().min(2).max(60).default('BD'),
});
export type ShippingAddressInput = z.infer<typeof ShippingAddressSchema>;

export const CheckoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().positive().max(99),
});

export const CreateOrderSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1, 'Your cart is empty').max(50),
  shippingAddress: ShippingAddressSchema,
  notes: z.string().max(500).trim().optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItemSummary {
  id: string;
  productId: string;
  slug?: string | null;
  productName: string;
  productImage?: string | null;
  unitPrice: string | number;
  quantity: number;
  lineTotal: string | number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: string | number;
  shipping: string | number;
  tax: string | number;
  discount: string | number;
  total: string | number;
  currency: string;
  createdAt: string;
  items: OrderItemSummary[];
}

export interface OrderListResponse {
  items: OrderSummary[];
  pagination: Pagination;
}

// ────────────────────────────────────────────────────────────────────────────
// SITE SETTINGS (white-label branding)
// ────────────────────────────────────────────────────────────────────────────

/** One card in the homepage feature strip. */
export interface SiteFeature {
  title: string;
  body: string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  accentColor?: string | null;
  accentColor2?: string | null;
  supportEmail?: string | null;
  socialFacebook?: string | null;
  socialInstagram?: string | null;

  // ── Editable storefront content (null → falls back to built-in defaults) ──
  heroBadge?: string | null;
  heroTitle?: string | null;
  heroHighlight?: string | null;
  heroSubtitle?: string | null;
  heroCtaLabel?: string | null;
  heroCtaHref?: string | null;
  heroCtaAltLabel?: string | null;
  heroCtaAltHref?: string | null;
  features?: SiteFeature[] | null;
  ctaHeading?: string | null;
  ctaBody?: string | null;
  ctaButtonLabel?: string | null;
  ctaButtonHref?: string | null;
  dealsTitle?: string | null;
  dealsBlurb?: string | null;
  dealsImage?: string | null;
  topbarPromo?: string | null;
  footerNote?: string | null;
  shippingNote?: string | null;
  returnsNote?: string | null;
  warrantyNote?: string | null;
  seoKeywords?: string | null;

  updatedAt?: string;
}

const emptyableText = (max: number) => z.string().max(max).trim().optional().or(z.literal(''));

export const SiteFeatureSchema = z.object({
  title: z.string().max(60).trim(),
  body: z.string().max(160).trim(),
});

export const UpdateSettingsSchema = z.object({
  siteName: z.string().min(1, 'Required').max(60).trim(),
  tagline: z.string().max(160).trim().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  faviconUrl: z.string().url().optional().or(z.literal('')),
  accentColor: z.string().regex(/^#([0-9a-fA-F]{6})$/, '6-digit hex').optional().or(z.literal('')),
  accentColor2: z.string().regex(/^#([0-9a-fA-F]{6})$/, '6-digit hex').optional().or(z.literal('')),
  supportEmail: z.string().email().optional().or(z.literal('')),
  socialFacebook: z.string().url().optional().or(z.literal('')),
  socialInstagram: z.string().url().optional().or(z.literal('')),

  // Content (all optional; empty string clears back to the built-in default)
  heroBadge: emptyableText(120),
  heroTitle: emptyableText(120),
  heroHighlight: emptyableText(60),
  heroSubtitle: emptyableText(400),
  heroCtaLabel: emptyableText(40),
  heroCtaHref: emptyableText(200),
  heroCtaAltLabel: emptyableText(40),
  heroCtaAltHref: emptyableText(200),
  features: z.array(SiteFeatureSchema).max(8).optional(),
  ctaHeading: emptyableText(120),
  ctaBody: emptyableText(400),
  ctaButtonLabel: emptyableText(40),
  ctaButtonHref: emptyableText(200),
  dealsTitle: emptyableText(60),
  dealsBlurb: emptyableText(160),
  dealsImage: z.string().url().optional().or(z.literal('')),
  topbarPromo: emptyableText(160),
  footerNote: emptyableText(120),
  shippingNote: emptyableText(80),
  returnsNote: emptyableText(80),
  warrantyNote: emptyableText(80),
  seoKeywords: emptyableText(300),
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
