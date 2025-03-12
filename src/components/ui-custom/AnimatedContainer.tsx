
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade' | 'slide' | 'scale' | 'none';
  delay?: number;
}

const AnimatedContainer = ({ 
  children, 
  className,
  animation = 'fade',
  delay = 0,
  ...props 
}: AnimatedContainerProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getAnimationClass = () => {
    if (!isVisible) return 'opacity-0';
    
    switch (animation) {
      case 'fade':
        return 'animate-fade-in';
      case 'slide':
        return 'animate-slide-in';
      case 'scale':
        return 'animate-scale-in';
      default:
        return '';
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        'transition-all duration-500',
        getAnimationClass(),
        className
      )}
      style={{ 
        transitionDelay: `${delay}ms`,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedContainer;
