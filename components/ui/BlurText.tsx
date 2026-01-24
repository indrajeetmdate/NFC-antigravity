import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const BlurText = ({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) => {
  const words = text.split(" ");

  return (
    <div className={cn("inline-block", className)}>
      {words.map((word, idx) => (
        <motion.span
          key={idx}
          initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: delay + idx * 0.1,
            ease: "easeOut",
          }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </div>
  );
};