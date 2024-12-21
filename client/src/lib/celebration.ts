import confetti from 'canvas-confetti';

export function triggerCelebration(isComplete: boolean) {
  // Configure confetti based on milestone
  const options = isComplete ? {
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 }
  } : {
    particleCount: 80,
    spread: 50,
    origin: { y: 0.7 }
  };

  // Trigger confetti
  confetti(options);
}

export function getRewardAmount(isComplete: boolean): number {
  if (isComplete) {
    // Return random number between 100-200 for completion
    return Math.floor(Math.random() * (200 - 100 + 1)) + 100;
  } else {
    // Return random number between 40-50 for halfway
    return Math.floor(Math.random() * (50 - 40 + 1)) + 40;
  }
}

export function getCelebrationMessage(isComplete: boolean): string {
  if (isComplete) {
    return "🎉 Congratulations! You've completed your goal!";
  } else {
    return "🌟 Amazing! You're halfway to your goal!";
  }
}
