export function updateFavicon() {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set background color based on theme
  const isDarkMode = document.documentElement.classList.contains('dark');
  ctx.fillStyle = isDarkMode ? '#1f2937' : '#f3f4f6';
  ctx.fillRect(0, 0, 32, 32);

  // Draw rounded rectangle background
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();

  // Draw the "Y" text
  ctx.fillStyle = '#4285f4';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Y', 16, 15);

  // Create or update favicon link element
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    document.head.appendChild(link);
  }
  link.href = canvas.toDataURL();
}
