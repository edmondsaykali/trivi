import { cn } from '@/lib/utils';

interface PlayerAvatarProps {
  src: string;
  alt: string;
  className?: string;
}

export function PlayerAvatar({ src, alt, className }: PlayerAvatarProps) {
  return (
    <img 
      src={src} 
      alt={alt}
      className={cn("rounded-full object-cover", className)}
      onError={(e) => {
        // Fallback to a placeholder if image fails to load
        (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face`;
      }}
    />
  );
}
