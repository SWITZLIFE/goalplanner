import { motion } from "framer-motion";

interface CoinAnimationProps {
  amount: number;
  onComplete?: () => void;
}

export function CoinAnimation({ amount, onComplete }: CoinAnimationProps) {
  if (amount <= 0) return null;

  return (
    <motion.div
      key="coin-animation"
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: -20,
        scale: [1, 1.2, 1],
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={onComplete}
      className="absolute right-0 text-yellow-500 font-bold"
    >
      +{amount}
    </motion.div>
  );
}
