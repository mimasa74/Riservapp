import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SwipeContainerProps {
  items: string[];
  currentIndex: number;
  onChange: (index: number) => void;
  children: (item: string) => React.ReactNode;
}

export const SwipeContainer = ({ items, currentIndex, onChange, children }: SwipeContainerProps) => {
  const [direction, setDirection] = useState(0);

  const handleDragEnd = (_e: any, { offset }: any) => {
    if (offset.x < -50 && currentIndex < items.length - 1) {
      setDirection(1);
      onChange(currentIndex + 1);
    } else if (offset.x > 50 && currentIndex > 0) {
      setDirection(-1);
      onChange(currentIndex - 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? '100%' : '-100%', opacity: 0 }),
  };

  return (
    <div className="w-full">
      {/* Pallini navigazione */}
      <div className="flex justify-center gap-2 py-3">
        {items.map((item, idx) => (
          <button
            key={item}
            onClick={() => { setDirection(idx > currentIndex ? 1 : -1); onChange(idx); }}
            className={`h-2 rounded-full transition-all duration-200 ${
              idx === currentIndex ? 'w-5 bg-[#5C6B3A]' : 'w-2 bg-[#d0d5c4]'
            }`}
          />
        ))}
      </div>

      {/* Contenuto — overflow-x nascosto per clip animazioni, overflow-y libero */}
      <div className="w-full" style={{ overflowX: 'clip' }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.15 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full"
          >
            {children(items[currentIndex])}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
