import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface ShinyButtonProps {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
}

export const ShinyButton: React.FC<ShinyButtonProps> = ({ children, to, onClick, className }) => {
  const Comp = to ? Link : motion.button;
  const props = to ? { to } : { onClick };

  return (
    // @ts-ignore
    <Comp
      {...props}
      className={cn(
        "relative inline-flex h-12 overflow-hidden rounded-lg p-[1px] focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-slate-50",
        className
      )}
    >
      <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#d7ba52_50%,#E2CBFF_100%)]" />
      <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-lg bg-black px-8 py-1 text-sm font-bold text-white backdrop-blur-3xl transition-colors hover:bg-zinc-900">
        {children}
      </span>
    </Comp>
  );
};
