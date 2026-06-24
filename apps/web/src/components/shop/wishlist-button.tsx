'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  productName?: string;
  /** 'overlay' = floating chip over a product image, 'inline' = bordered button. */
  variant?: 'overlay' | 'inline';
  className?: string;
}

export function WishlistButton({
  productId,
  productName,
  variant = 'overlay',
  className,
}: WishlistButtonProps) {
  const router = useRouter();
  const wishlisted = useWishlistStore((s) => s.ids.includes(productId));
  const toggle = useWishlistStore((s) => s.toggle);
  const user = useAuthStore((s) => s.user);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Sign in to save items', {
        description: 'Your wishlist syncs to your account.',
      });
      router.push('/login?next=/wishlist');
      return;
    }

    const result = await toggle(productId);
    if (result === null) {
      toast.error('Could not update your wishlist');
      return;
    }
    if (result) {
      toast.success('Saved to wishlist', { description: productName });
    } else {
      toast('Removed from wishlist', { description: productName });
    }
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.85 }}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'grid place-items-center transition-colors',
        variant === 'overlay'
          ? 'w-9 h-9 rounded-full bg-[color:var(--bg)]/80 backdrop-blur border border-[color:var(--border)] hover:bg-[color:var(--bg)] shadow-sm'
          : 'w-12 h-12 rounded-xl border border-[color:var(--border)] hover:bg-[color:var(--bg-soft)]',
        className,
      )}
    >
      <Heart
        className={cn(
          'w-[18px] h-[18px] transition-all',
          wishlisted
            ? 'fill-rose-500 text-rose-500'
            : 'text-[color:var(--fg-muted)] hover:text-rose-500',
        )}
      />
    </motion.button>
  );
}
