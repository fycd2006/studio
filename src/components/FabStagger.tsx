"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownRight } from "lucide-react";

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      staggerDirection: -1, // bottom-up: last child first
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.04,
      staggerDirection: 1, // top-down on exit: top child first
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    x: 16,
    scale: 0.5,
  },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 420,
      damping: 22,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    x: 12,
    scale: 0.6,
    transition: {
      duration: 0.15,
      ease: "easeIn",
    },
  },
};

interface FabStaggerProps {
  children: React.ReactNode;
  className?: string;
}

export function FabStagger({ children, className }: FabStaggerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={className}>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-end gap-3 pointer-events-none"
          >
            {React.Children.map(children, (child) => (
              <motion.div variants={itemVariants} className="pointer-events-auto">
                {child}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-auto">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] rounded-full bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgba(140,120,100,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex items-center justify-center text-stone-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-amber-500 transition-colors border border-stone-100 dark:border-white/5"
        >
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ArrowDownRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </motion.div>
        </button>
      </div>
    </div>
  );
}
