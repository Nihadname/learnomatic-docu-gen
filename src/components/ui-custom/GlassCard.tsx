
import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'bordered';
}

const GlassCard = ({ 
  children, 
  className,
  variant = 'default',
  ...props 
}: GlassCardProps) => {
  return (
    <div 
      className={cn(
        'rounded-xl overflow-hidden animate-blur-in',
        variant === 'default' && 'bg-white/70 backdrop-blur-lg shadow-md',
        variant === 'elevated' && 'bg-white/80 backdrop-blur-lg shadow-lg border border-white/20',
        variant === 'bordered' && 'bg-white/60 backdrop-blur-md border border-white/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassCard;
