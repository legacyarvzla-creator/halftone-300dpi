// --- 3. REJILLA CUADRADA (CONTORNOS LIMPIOS SIN PIXELACIÓN + TRAMADO SUAVE) ---
  } else if (currentMethod === 'standard') {
    // 1. Dibujamos la imagen original completa y limpia de fondo para mantener los trazos suaves del traje y las letras
    ctx.drawImage(sourceToProcess, 0, 0);

    // 2. Extraemos los píxeles para aplicar la trama de puntos únicamente sobre la nebulosa azul y sombras
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(sourceToProcess, 0, 0);
    const dataPixels = tCtx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Limpiamos la zona de la nebulosa en el canvas principal para redibujarla con tramado de puntos puro
    for (let y = 0; y < canvas.height; y += cellSize) {
      for (let x = 0; x < canvas.width; x += cellSize) {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        const sampleX = Math.min(Math.max(Math.floor(cx), 0), canvas.width - 1);
        const sampleY = Math.min(Math.max(Math.floor(cy), 0), canvas.height - 1);
        const idx = (sampleY * canvas.width + sampleX) * 4;

        if (dataPixels[idx + 3] < 20) continue;

        let r = adjustChannel(dataPixels[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(dataPixels[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(dataPixels[idx+2], blackPoint, whitePoint, gamma);

        if (r < 15 && g < 15 && b < 15) continue;

        let maxC = Math.max(r, g, b);
        let minC = Math.min(r, g, b);
        let saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;

        // Omitir zonas de blanco sólido (traje) y colores muy saturados (letras verdes) para que queden intactas sin puntos
        if ((r > 180 && g > 180 && b > 180) || (saturation > 0.35 && maxC > 100)) {
          continue;
        }

        // Borramos el fondo sólido en esta celda para dejar espacio solo al punto de semitono
        ctx.clearRect(x, y, cellSize, cellSize);

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let radius = (luma / 255) * (cellSize * 0.58);

        if (radius > 0.15) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);
          ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

          ctx.beginPath();
          if (shape === 'round') {
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            const lineWidth = radius * 1.5;
            ctx.fillRect(-cellSize / 2, -lineWidth / 2, cellSize, lineWidth);
          }
          ctx.restore();
        }
      }
    }
