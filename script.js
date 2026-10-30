function processHalftone() {
  let sourceToProcess = loadedImage;
  if (cropBgToggle.checked) {
    const thresholdVal = parseInt(cropThresholdInput.value, 10);
    sourceToProcess = getCroppedImageCanvas(loadedImage, thresholdVal);
  }

  canvas.width = sourceToProcess.width;
  canvas.height = sourceToProcess.height;

  // Limpiamos el canvas inicial para asegurar transparencia
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceToProcess, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const blackPoint = parseInt(blackPointInput.value, 10);
  const whitePoint = parseInt(whitePointInput.value, 10);
  const gamma = parseFloat(gammaInput.value);
  const isInverted = invertToggle.checked;
  const isColorMode = colorModeSelect.value === 'color';

  const width = canvas.width;
  const height = canvas.height;

  // Limpieza profunda del canvas antes de redibujar los puntos
  ctx.clearRect(0, 0, width, height);

  const method = methodSelect.value;
  const lpi = parseInt(screenLpiInput.value, 10);
  const cellSize = Math.max(2, Math.round(150 / lpi));

  if (method === 'diffusion') {
    const imgOut = ctx.createImageData(width, height);
    const outData = imgOut.data;

    const bufferR = new Float32Array(width * height);
    const bufferG = new Float32Array(width * height);
    const bufferB = new Float32Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 20) {
        bufferR[i / 4] = -1;
        continue;
      }

      let r = adjustChannel(data[i], blackPoint, whitePoint, gamma);
      let g = adjustChannel(data[i+1], blackPoint, whitePoint, gamma);
      let b = adjustChannel(data[i+2], blackPoint, whitePoint, gamma);

      if (isInverted) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      bufferR[i / 4] = r;
      bufferG[i / 4] = g;
      bufferB[i / 4] = b;
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const outIdx = idx * 4;

        if (bufferR[idx] === -1) {
          outData[outIdx + 3] = 0; // Transparente real
          continue;
        }

        if (isColorMode) {
          const oldR = bufferR[idx], oldG = bufferG[idx], oldB = bufferB[idx];
          const newR = oldR < 128 ? 0 : 255;
          const newG = oldG < 128 ? 0 : 255;
          const newB = oldB < 128 ? 0 : 255;

          outData[outIdx] = newR;
          outData[outIdx+1] = newG;
          outData[outIdx+2] = newB;
          outData[outIdx+3] = 255;

          const errR = oldR - newR, errG = oldG - newG, errB = oldB - newB;
          if (x + 1 < width && bufferR[idx + 1] !== -1) {
            bufferR[idx + 1] += errR * 7 / 16;
            bufferG[idx + 1] += errG * 7 / 16;
            bufferB[idx + 1] += errB * 7 / 16;
          }
          if (y + 1 < height) {
            if (x > 0 && bufferR[idx + width - 1] !== -1) {
              bufferR[idx + width - 1] += errR * 3 / 16;
              bufferG[idx + width - 1] += errG * 3 / 16;
              bufferB[idx + width - 1] += errB * 3 / 16;
            }
            if (bufferR[idx + width] !== -1) {
              bufferR[idx + width] += errR * 5 / 16;
              bufferG[idx + width] += errG * 5 / 16;
              bufferB[idx + width] += errB * 5 / 16;
            }
            if (x + 1 < width && bufferR[idx + width + 1] !== -1) {
              bufferR[idx + width + 1] += errR * 1 / 16;
              bufferG[idx + width + 1] += errG * 1 / 16;
              bufferB[idx + width + 1] += errB * 1 / 16;
            }
          }
        } else {
          const luma = 0.299 * bufferR[idx] + 0.587 * bufferG[idx] + 0.114 * bufferB[idx];
          const newPixel = luma < 128 ? 0 : 255;
          const error = luma - newPixel;

          const val = isInverted ? (newPixel === 0 ? 255 : 0) : newPixel;
          outData[outIdx] = val;
          outData[outIdx+1] = val;
          outData[outIdx+2] = val;
          outData[outIdx+3] = 255;

          if (x + 1 < width && bufferR[idx + 1] !== -1) bufferR[idx + 1] += error * 7 / 16;
          if (y + 1 < height) {
            if (x > 0 && bufferR[idx + width - 1] !== -1) bufferR[idx + width - 1] += error * 3 / 16;
            if (bufferR[idx + width] !== -1) bufferR[idx + width] += error * 5 / 16;
            if (x + 1 < width && bufferR[idx + width + 1] !== -1) bufferR[idx + width + 1] += error * 1 / 16;
          }
        }
      }
    }
    ctx.putImageData(imgOut, 0, 0);

  } else {
    // Método Halftone Clásico (Puntos / Líneas)
    const angleRad = (parseFloat(screenAngleInput.value) * Math.PI) / 180;
    const shape = dotShapeSelect.value;

    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        const sampleX = Math.min(Math.max(Math.floor(cx), 0), width - 1);
        const sampleY = Math.min(Math.max(Math.floor(cy), 0), height - 1);
        const idx = (sampleY * width + sampleX) * 4;

        // Si el píxel base es transparente, omitimos dibujar el punto
        if (data[idx + 3] < 20) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        if (isInverted) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let brightness = luma / 255;
        let radius = (1 - brightness) * (cellSize / 2);

        if (radius > 0.3) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);

          if (isColorMode) {
            ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
          } else {
            ctx.fillStyle = isInverted ? '#ffffff' : '#000000';
          }

          ctx.beginPath();
          if (shape === 'round') {
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (shape === 'line') {
            const lineWidth = radius * 1.8;
            ctx.fillRect(-cellSize / 2, -lineWidth / 2, cellSize, lineWidth);
          }
          ctx.restore();
        }
      }
    }
  }
}
