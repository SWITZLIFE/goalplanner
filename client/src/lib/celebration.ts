import confetti from 'canvas-confetti';

export function triggerCelebration(isComplete: boolean) {
  // Configure confetti based on milestone
  const options: confetti.Options = {
    particleCount: isComplete ? 150 : 80,
    spread: isComplete ? 70 : 50,
    origin: { y: isComplete ? 0.6 : 0.7 },
    colors: isComplete ? 
      ['#FFD700', '#FFA500', '#FF6347'] : // Gold, Orange, Tomato
      ['#4CAF50', '#2196F3', '#9C27B0'], // Green, Blue, Purple
    startVelocity: isComplete ? 45 : 30,
    gravity: 1,
    scalar: 1,
    ticks: 70,
    shapes: ['square', 'circle'],
    zIndex: 100,
  };

  // Create multiple bursts for a more dramatic effect
  if (isComplete) {
    // Multiple bursts for completion
    confetti({
      ...options,
      angle: 60,
      origin: { x: 0, y: 0.8 }
    });
    confetti({
      ...options,
      angle: 120,
      origin: { x: 1, y: 0.8 }
    });
    setTimeout(() => {
      confetti(options);
    }, 200);
  } else {
    // Single burst for halfway
    confetti(options);
  }
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
