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
