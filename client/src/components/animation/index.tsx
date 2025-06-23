import { motion, MotionProps } from "framer-motion";
import { ReactNode } from "react";

// Fade In
export const FadeIn = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// SlideUp
export const SlideUp = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -40 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// SlideDown
export const SlideDown = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: -40 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -40 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Zoom In
export const ZoomIn = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Slide From Left
export const SlideLeft = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: -100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -100 }}
    transition={{ duration: 0.4 }}
  >
    {children}
  </motion.div>
);

// Slide From Right
export const SlideRight = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 100 }}
    transition={{ duration: 0.4 }}
  >
    {children}
  </motion.div>
);

// Slide + Scale
export const SlideScale = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ y: 30, scale: 0.95 }}
    animate={{ y: 0, scale: 1 }}
    exit={{ y: -30, scale: 0.95 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Pop (Spring Bounce)
export const PopSpring = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
    transition={{ type: "spring", stiffness: 120 }}
  >
    {children}
  </motion.div>
);

// Tuỳ chỉnh
export const MotionWrapper = ({
  children,
  motionProps,
}: {
  children: ReactNode;
  motionProps: MotionProps;
}) => <motion.div {...motionProps}>{children}</motion.div>;
