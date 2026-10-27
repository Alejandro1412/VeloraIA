"use client";

import { motion } from "motion/react";

/** Every panel screen glides in: a soft rise with a blur that clears. */
export default function PanelTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      // Clear filter/transform afterwards so fixed drawers and dialogs inside keep working.
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none", transform: "none" } }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
