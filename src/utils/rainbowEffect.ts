// Rainbow effect utilities for Ultimate admin abuse

export const getRandomColor = (): string => {
  const hue = Math.random() * 360;
  return `hsl(${hue}, 100%, 50%)`;
};

export const getRainbowColor = (time: number, speed: number = 1): string => {
  const hue = (time * speed) % 360;
  return `hsl(${hue}, 100%, 50%)`;
};

let rainbowStyleId = "rainbow-effect-style";

export const applyRainbowToDocument = () => {
  // Remove existing if present
  removeRainbowFromDocument();
  
  const style = document.createElement("style");
  style.id = rainbowStyleId;
  style.textContent = `
    @keyframes rainbow-hue {
      0% { filter: hue-rotate(0deg) saturate(1.5) brightness(1.1); }
      100% { filter: hue-rotate(360deg) saturate(1.5) brightness(1.1); }
    }
    
    @keyframes rainbow-gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes rainbow-text {
      0% { color: #ff0000; }
      14% { color: #ff7f00; }
      28% { color: #ffff00; }
      42% { color: #00ff00; }
      57% { color: #0000ff; }
      71% { color: #4b0082; }
      85% { color: #9400d3; }
      100% { color: #ff0000; }
    }
    
    @keyframes rainbow-border {
      0% { border-color: #ff0000; }
      14% { border-color: #ff7f00; }
      28% { border-color: #ffff00; }
      42% { border-color: #00ff00; }
      57% { border-color: #0000ff; }
      71% { border-color: #4b0082; }
      85% { border-color: #9400d3; }
      100% { border-color: #ff0000; }
    }
    
    body.ultimate-rainbow-mode {
      background: linear-gradient(45deg, 
        #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000
      ) !important;
      background-size: 400% 400% !important;
      animation: rainbow-gradient 2s ease infinite !important;
    }
    
    body.ultimate-rainbow-mode * {
      animation: rainbow-hue 0.5s linear infinite !important;
    }
    
    body.ultimate-rainbow-mode button,
    body.ultimate-rainbow-mode .card,
    body.ultimate-rainbow-mode [class*="Card"],
    body.ultimate-rainbow-mode [class*="Button"] {
      animation: rainbow-border 1s linear infinite, rainbow-hue 0.5s linear infinite !important;
      border-width: 2px !important;
      border-style: solid !important;
    }
    
    body.ultimate-rainbow-mode h1,
    body.ultimate-rainbow-mode h2,
    body.ultimate-rainbow-mode h3,
    body.ultimate-rainbow-mode p,
    body.ultimate-rainbow-mode span {
      animation: rainbow-text 2s linear infinite !important;
    }
  `;
  document.head.appendChild(style);
  document.body.classList.add("ultimate-rainbow-mode");
  console.log("Rainbow mode activated!");
};

export const removeRainbowFromDocument = () => {
  const style = document.getElementById(rainbowStyleId);
  if (style) {
    style.remove();
  }
  document.body.classList.remove("ultimate-rainbow-mode");
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