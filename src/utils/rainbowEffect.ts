// Rainbow effect utilities for Ultimate admin abuse

export const getRandomColor = (): string => {
  const hue = Math.random() * 360;
  return `hsl(${hue}, 100%, 50%)`;
};

export const getRainbowColor = (time: number, speed: number = 1): string => {
  const hue = (time * speed) % 360;
  return `hsl(${hue}, 100%, 50%)`;
};

export const applyRainbowToDocument = () => {
  const style = document.createElement("style");
  style.id = "rainbow-effect";
  style.textContent = `
    @keyframes rainbow-bg {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
    
    body.ultimate-mode * {
      animation: rainbow-bg 0.5s linear infinite !important;
    }
    
    body.ultimate-mode {
      background: linear-gradient(45deg, 
        red, orange, yellow, green, blue, indigo, violet, red
      ) !important;
      background-size: 400% 400% !important;
      animation: rainbow-gradient 1s ease infinite !important;
    }
    
    @keyframes rainbow-gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add("ultimate-mode");
};

export const removeRainbowFromDocument = () => {
  const style = document.getElementById("rainbow-effect");
  if (style) style.remove();
  document.body.classList.remove("ultimate-mode");
};

export const startRainbowEffect = (
  callback: (color: string) => void,
  intervalMs: number = 100
): NodeJS.Timeout => {
  let time = 0;
  return setInterval(() => {
    time += intervalMs;
    callback(getRainbowColor(time / 10));
  }, intervalMs);
};