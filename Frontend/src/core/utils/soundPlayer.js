export const playPassSound = () => {
  const audio = new Audio('/sounds/pass-beep.mp3');
  audio.play().catch(() => {});
};

export const playFailSound = () => {
  const audio = new Audio('/sounds/fail-buzzer.mp3');
  audio.play().catch(() => {});
};
