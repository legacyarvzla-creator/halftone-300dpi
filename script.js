const imageInput = document.getElementById('imageInput');
const methodSelect = document.getElementById('methodSelect');
const screenLpiInput = document.getElementById('screenLpi');
const lpiVal = document.getElementById('lpiVal');
const screenAngleInput = document.getElementById('screenAngle');
const angleVal = document.getElementById('angleVal');
const dotShapeSelect = document.getElementById('dotShape');
const downloadBtn = document.getElementById('downloadBtn');

const cropBgToggle = document.getElementById('cropBgToggle');
const cropThresholdInput = document.getElementById('cropThreshold');
const cropThresholdValue = document.getElementById('cropThresholdValue');
const cropThresholdGroup = document.getElementById('cropThresholdGroup');

const blackPointInput = document.getElementById('blackPoint');
const blackPointVal = document.getElementById('blackPointVal');
const whitePointInput = document.getElementById('whitePoint');
const whitePointVal = document.getElementById('whitePointVal');
const gammaInput = document.getElementById('gammaInput');
const gammaVal = document.getElementById('gammaVal');

const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true }) : null;

const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomValDisplay = document.getElementById('zoomVal');

let currentZoom = 1.0; 
let loadedImage = null;

function updateZoomDisplay() {
  if (canvas) {
    canvas.style.transform = `scale(${currentZoom})`;
    canvas.style.transformOrigin = 'top left';
  }
  if (zoomValDisplay) {
    zoomValDisplay.textContent = Math.round(currentZoom * 100) + '%';
  }
}

if (zoomInBtn) {
  zoomInBtn.addEventListener('click', () => {
    currentZoom = Math.min(5.0, currentZoom + 0.25);
    updateZoomDisplay();
  });
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => {
    currentZoom = Math.max(0.25, currentZoom - 0.25);
    updateZoomDisplay();
  });
}

if (zoomResetBtn) {
  zoomResetBtn.addEventListener('click', () => {
    currentZoom = 1.0;
    updateZoomDisplay();
  });
}

window.resetInput = function(id, defaultValue) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = defaultValue;
  el.dispatchEvent(new Event('input'));
};

if (cropBgToggle) {
  cropBgToggle.addEventListener('change', () => {
    if (cropBgToggle.checked && cropThresholdGroup) {
      cropThresholdGroup.style.opacity = '1';
      cropThresholdGroup.style.pointerEvents = 'auto';
    } else if (cropThresholdGroup) {
      cropThresholdGroup.style.opacity = '0.5';
      cropThresholdGroup.style.pointerEvents = 'none';
    }
    if (loadedImage) processHalftone();
  });
}

if (cropThresholdInput) {
  cropThresholdInput.addEventListener('input', () => {
    if (cropThresholdValue) cropThresholdValue.textContent = cropThresholdInput.value;
    if (loadedImage && cropBgToggle && cropBgToggle.checked) processHalftone();
  });
}

if (screenLpiInput) screenLpiInput.addEventListener('input', () => { if (lpiVal) lpiVal.textContent = screenLpiInput.value; if (loadedImage) processHalftone(); });
if (screenAngleInput) screenAngleInput.addEventListener('input', () => { if (angleVal) angleVal.textContent = screenAngleInput.value; if (loadedImage) processHalftone(); });
if (methodSelect) methodSelect.addEventListener('change', () => { if (loadedImage) processHalftone(); });
if (dotShapeSelect) dotShapeSelect.addEventListener('change', () => { if (loadedImage) processHalftone(); });
if (blackPointInput) blackPointInput.addEventListener('input', () => { if (blackPointVal) blackPointVal.textContent = blackPointInput.value; if (loadedImage) processHalftone(); });
if (whitePointInput) whitePointInput.addEventListener('input', () => { if (whitePointVal) whitePointVal.textContent = whitePointInput.value; if (loadedImage) processHalftone(); });
if (gammaInput) gammaInput.addEventListener('input', () => { if (gammaVal) gammaVal.textContent = parseFloat(gammaInput.value).toFixed(2); if (loadedImage) processHalftone(); });

if (imageInput) {
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        canvas.width = img.width;
        canvas.height = img.height;
        currentZoom = 1.0;
        updateZoomDisplay();
        processHalftone();
        if (downloadBtn) downloadBtn.disabled = false;
      };
      img.onerror = () => { alert("Error al cargar la imagen."); };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function adjustChannel(val, blackPoint, whitePoint, gamma) {
  let v = val;
  if (whitePoint > blackPoint) {
    v = ((v - blackPoint) / (whitePoint - blackPoint)) * 255;
  }
  v = Math.max(0, Math.min(255, v));
  if (gamma !== 1) {
    let norm = v / 255;
    norm = Math.pow(norm, 1 / gamma);
    v = norm * 255;
  }
  return v;
}

function processHalftone() {
  if (!loadedImage || !canvas || !ctx) return;

  canvas.width = loadedImage.width;
  canvas.height = loadedImage.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const blackPoint = parseInt(blackPointInput ? blackPointInput.value : 0, 10);
  const whitePoint = parseInt(whitePointInput ? whitePointInput.value : 255, 10);
  const gamma = parseFloat(gammaInput ? gammaInput.value : 1.0);
  const angleRad = (parseFloat(screenAngleInput ? screenAngleInput.value : 22.5) * Math.PI) / 180;
  const shape = dotShapeSelect ? dotShapeSelect.value : 'round';
  const lpi = parseInt(screenLpiInput ? screenLpiInput.value : 30, 10);
  const currentMethod = methodSelect ? methodSelect.value : 'diffusion_original';
  
  const cellSize = Math.max(3, Math.round(180 / lpi));

  // --- 1. DIFUSIÓN / GRANO REAL ORIGINAL (TU FAVORITO) ---
  if (currentMethod === 'diffusion_original') {
    ctx.drawImage(loadedImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 20 || (data[i] < 25 && data[i + 1] < 25 && data[i + 2] < 25)) {
        data[i + 3] = 0;
        continue;
      }
      data[i] = adjustChannel(data[i], blackPoint, whitePoint, gamma);
      data[i + 1] = adjustChannel(data[i+1], blackPoint, whitePoint, gamma);
      data[i + 2] = adjustChannel(data[i+2], blackPoint, whitePoint, gamma);
    }
    ctx.putImageData(imgData, 0, 0);

  // --- 2. DIFUSIÓN / GRANO AJUSTABLE ---
  } else if (currentMethod === 'diffusion_variable') {
    ctx.drawImage(loadedImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const step = Math.max(2, Math.round(180 / lpi));
    const dotSize = Math.max(1, Math.round(step * 0.45));

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx + 3] < 20) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        if (r < 25 && g < 25 && b < 25) continue;

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        if (Math.random() < (luma / 255)) {
          ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
          if (shape === 'round') {
            ctx.beginPath();
            ctx.arc(x + step / 2, y + step / 2, dotSize, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(x + step / 2 - dotSize / 2, y + step / 2 - dotSize / 2, dotSize * 1.5, dotSize * 1.5);
          }
        }
      }
    }

  // --- 3. REJILLA CUADRADA ---
  } else if (currentMethod === 'standard') {
    ctx.drawImage(loadedImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += cellSize) {
      for (let x = 0; x < canvas.width; x += cellSize) {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const idx = (Math.floor(cy) * canvas.width + Math.floor(cx)) * 4;

        if (idx >= data.length || data[idx + 3] < 20) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        if (r < 15 && g < 15 && b < 15) continue;

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let radius = (luma / 255) * (cellSize * 0.58);

        if (radius > 0.2) {
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

  // --- 4. TRAMADO HEXAGONAL ---
  } else if (currentMethod === 'hexagonal') {
    ctx.drawImage(loadedImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rowHeight = cellSize * 0.866; 
    let rowIndex = 0;
    for (let y = 0; y < canvas.height + cellSize; y += rowHeight) {
      const xOffset = (rowIndex % 2 === 0) ? 0 : cellSize / 2;
      for (let x = -cellSize; x < canvas.width + cellSize; x += cellSize) {
        const cx = x + xOffset + cellSize / 2;
        const cy = y + rowHeight / 2;
        const idx = (Math.floor(cy) * canvas.width + Math.floor(cx)) * 4;

        if (idx >= data.length || data[idx + 3] < 20) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        if (r < 15 && g < 15 && b < 15) continue;

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let radius = (luma / 255) * (cellSize * 0.5);

        if (radius > 0.3) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      rowIndex++;
    }

  // --- 5. LÍNEAS DE GRABADO ---
  } else if (currentMethod === 'lines') {
    ctx.drawImage(loadedImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += cellSize) {
      for (let x = 0; x < canvas.width; x += cellSize) {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const idx = (Math.floor(cy) * canvas.width + Math.floor(cx)) * 4;

        if (idx >= data.length || data[idx + 3] < 20) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        if (r < 15 && g < 15 && b < 15) continue;

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let lineHeight = (luma / 255) * cellSize;

        if (lineHeight > 0.4) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);
          ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
          ctx.fillRect(-cellSize / 2, -lineHeight / 2, cellSize, lineHeight);
          ctx.restore();
        }
      }
    }

  // --- 6. ANILLOS CONCÉNTRICOS ---
  } else if (currentMethod === 'concentric') {
    ctx.drawImage(loadedImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx + 3] < 20 || (data[idx] < 25 && data[idx+1] < 25 && data[idx+2] < 25)) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        let dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        let wave = Math.sin(dist / (cellSize * 0.4));
        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let threshold = 1 - (luma / 255) * 2;

        if (wave > threshold) {
          ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

  // --- 7. DIFUMINADO ORGÁNICO ---
  } else if (currentMethod === 'stochastic_fade') {
    ctx.drawImage(loadedImage, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y += cellSize) {
      for (let x = 0; x < canvas.width; x += cellSize) {
        const jitterX = (Math.random() - 0.5) * (cellSize * 0.7);
        const jitterY = (Math.random() - 0.5) * (cellSize * 0.7);
        
        const cx = x + cellSize / 2 + jitterX;
        const cy = y + cellSize / 2 + jitterY;
        const idx = (Math.floor(cy) * canvas.width + Math.floor(cx)) * 4;

        if (idx >= data.length || data[idx + 3] < 20) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        if (r < 15 && g < 15 && b < 15) continue;

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let radius = (luma / 255) * (cellSize * 0.45);

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
            ctx.fillRect(-cellSize / 2, -radius / 2, cellSize, radius);
          }
          ctx.restore();
        }
      }
    }

  // --- 8. HÍBRIDO LEGACY (AZUL INTENSO DE TU FAVORITO + MICROPUNTOS DE CÓMIC) ---
  } else if (currentMethod === 'hybrid_legacy') {
    ctx.drawImage(loadedImage, 0, 0);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = loadedImage.width;
    tempCanvas.height = loadedImage.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(loadedImage, 0, 0);
    const data = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

    // 1. Base sólida intacta: Traje blanco y letras verdes
    const outImgData = ctx.createImageData(canvas.width, canvas.height);
    const outPx = outImgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 20) continue;

      let r = adjustChannel(data[i], blackPoint, whitePoint, gamma);
      let g = adjustChannel(data[i+1], blackPoint, whitePoint, gamma);
      let b = adjustChannel(data[i+2], blackPoint, whitePoint, gamma);

      let isWhite = (r > 180 && g > 180 && b > 180);
      let isGreenText = (g > r + 30 && g > b + 30);

      if (isWhite || isGreenText) {
        outPx[i] = r;
        outPx[i+1] = g;
        outPx[i+2] = b;
        outPx[i+3] = data[i+3];
      }
    }
    ctx.putImageData(outImgData, 0, 0);

    // 2. Nebulosa: Mantenemos la riqueza de color exacto de tu favorito, pero aplicando micropuntos ordenados
    const fineStep = Math.max(2, Math.round(cellSize * 0.45)); // Puntos muy finos estilo cómic

    for (let y = 0; y < canvas.height; y += fineStep) {
      for (let x = 0; x < canvas.width; x += fineStep) {
        const cx = x + fineStep / 2;
        const cy = y + fineStep / 2;
        const sampleX = Math.min(Math.max(Math.floor(cx), 0), canvas.width - 1);
        const sampleY = Math.min(Math.max(Math.floor(cy), 0), canvas.height - 1);
        const idx = (sampleY * canvas.width + sampleX) * 4;

        if (data[idx + 3] < 20) continue;

        let r = adjustChannel(data[idx], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[idx+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[idx+2], blackPoint, whitePoint, gamma);

        if (r < 20 && g < 20 && b < 20) continue;

        let isWhite = (r > 180 && g > 180 && b > 180);
        let isGreenText = (g > r + 30 && g > b + 30);

        if (isWhite || isGreenText) continue;

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        // Combinamos la densidad de puntos con la luminancia para mantener el color azul profundo y vibrante
        let dotRadius = (luma / 255) * (fineStep * 0.75);

        if (dotRadius > 0.3) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);
          // Usamos el color RGB original enriquecido tal cual tu método favorito
          ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

          ctx.beginPath();
          ctx.arc(0, 0, dotRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}

function setPngDpi(dataUrl, dpi = 300) {
  const ppm = Math.round(dpi / 0.0254);
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const insertIndex = 33;
  const physChunk = new Uint8Array(21);
  const view = new DataView(physChunk.buffer);
  
  view.setUint32(0, 9);
  physChunk[4] = 112; 
  physChunk[5] = 72;  
  physChunk[6] = 89;  
  physChunk[7] = 115; 
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  physChunk[16] = 1;

  const crc = calculateCRC32(physChunk.subarray(4, 17));
  view.setUint32(17, crc);

  const finalBytes = new Uint8Array(bytes.length + physChunk.length);
  finalBytes.set(bytes.subarray(0, insertIndex), 0);
  finalBytes.set(physChunk, insertIndex);
  finalBytes.set(bytes.subarray(insertIndex), insertIndex + physChunk.length);

  let newBinary = '';
  for (let i = 0; i < finalBytes.length; i++) {
    newBinary += String.fromCharCode(finalBytes[i]);
  }
  return 'data:image/png;base64,' + btoa(newBinary);
}

function calculateCRC32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

if (downloadBtn) {
  downloadBtn.addEventListener('click', () => {
    if (!loadedImage) return;

    try {
      downloadBtn.textContent = 'Generando archivo...';
      downloadBtn.disabled = true;

      setTimeout(() => {
        const originalDataUrl = canvas.toDataURL('image/png', 1.0);
        const dpiDataUrl = setPngDpi(originalDataUrl, 300);

        const link = document.createElement('a');
        link.download = 'semitonos_legacy_300dpi.png';
        link.href = dpiDataUrl;
        link.click();

        downloadBtn.textContent = 'Descargar Imagen (300 DPI - Transparente)';
        downloadBtn.disabled = false;
      }, 100);

    } catch (error) {
      console.error("Error al descargar:", error);
      alert("La imagen es demasiado grande para la memoria del navegador.");
      downloadBtn.textContent = 'Descargar Imagen (300 DPI - Transparente)';
      downloadBtn.disabled = false;
    }
  });
}
