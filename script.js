const imageInput = document.getElementById('imageInput');
const colorModeSelect = document.getElementById('colorModeSelect');
const methodSelect = document.getElementById('methodSelect');
const screenLpiInput = document.getElementById('screenLpi');
const lpiVal = document.getElementById('lpiVal');
const screenAngleInput = document.getElementById('screenAngle');
const angleVal = document.getElementById('angleVal');
const dotShapeSelect = document.getElementById('dotShape');
const invertToggle = document.getElementById('invertToggle');
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

// Controles de Zoom
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomValDisplay = document.getElementById('zoomVal');

let currentZoom = 1.0; // 1.0 = 100%
let loadedImage = null;
let activeColorFilter = 'all';

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

document.querySelectorAll('.color-filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.color-filter-btn').forEach(b => {
      b.style.background = '#f8f9fa';
      b.style.color = '#000';
      b.classList.remove('active');
    });
    e.target.style.background = '#2c3e50';
    e.target.style.color = '#fff';
    e.target.classList.add('active');

    activeColorFilter = e.target.getAttribute('data-color');
    if (loadedImage) processHalftone();
  });
});

if (cropBgToggle) {
  cropBgToggle.addEventListener('change', () => {
    if (cropBgToggle.checked) {
      if (cropThresholdGroup) {
        cropThresholdGroup.style.opacity = '1';
        cropThresholdGroup.style.pointerEvents = 'auto';
      }
    } else {
      if (cropThresholdGroup) {
        cropThresholdGroup.style.opacity = '0.5';
        cropThresholdGroup.style.pointerEvents = 'none';
      }
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

if (colorModeSelect) colorModeSelect.addEventListener('change', () => { if (loadedImage) processHalftone(); });
if (screenLpiInput) screenLpiInput.addEventListener('input', () => { if (lpiVal) lpiVal.textContent = screenLpiInput.value; if (loadedImage) processHalftone(); });
if (screenAngleInput) screenAngleInput.addEventListener('input', () => { if (angleVal) angleVal.textContent = screenAngleInput.value; if (loadedImage) processHalftone(); });
if (methodSelect) methodSelect.addEventListener('change', () => { if (loadedImage) processHalftone(); });
if (dotShapeSelect) dotShapeSelect.addEventListener('change', () => { if (loadedImage) processHalftone(); });
if (invertToggle) invertToggle.addEventListener('change', () => { if (loadedImage) processHalftone(); });
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
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }

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

function getCroppedImageCanvas(img, threshold) {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  tempCtx.drawImage(img, 0, 0);

  const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imgData.data;
  const width = tempCanvas.width;
  const height = tempCanvas.height;

  let top = 0, bottom = height, left = 0, right = width;

  toping: for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx+3] > 20 && (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold)) {
        top = y;
        break toping;
      }
    }
  }

  bottoming: for (let y = height - 1; y >= top; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx+3] > 20 && (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold)) {
        bottom = y + 1;
        break bottoming;
      }
    }
  }

  lefting: for (let x = 0; x < width; x++) {
    for (let y = top; y < bottom; y++) {
      const idx = (y * width + x) * 4;
      if (data[idx+3] > 20 && (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold)) {
        left = x;
        break lefting;
      }
    }
  }

  righting: for (let x = width - 1; x >= left; x--) {
    for (let y = top; y < bottom; y++) {
      const idx = (y * width + x) * 4;
      if (data[idx+3] > 20 && (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold)) {
        right = x + 1;
        break righting;
      }
    }
  }

  const croppedWidth = right - left;
  const croppedHeight = bottom - top;
  if (croppedWidth <= 0 || croppedHeight <= 0) return img;

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;
  croppedCtx.drawImage(tempCanvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

  return croppedCanvas;
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

  let sourceToProcess = loadedImage;
  if (cropBgToggle && cropBgToggle.checked) {
    const thresholdVal = parseInt(cropThresholdInput ? cropThresholdInput.value : 20, 10);
    sourceToProcess = getCroppedImageCanvas(loadedImage, thresholdVal);
  }

  canvas.width = sourceToProcess.width;
  canvas.height = sourceToProcess.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceToProcess, 0, 0);

  const imgDataLayer = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pxData = imgDataLayer.data;
  for (let i = 0; i < pxData.length; i += 4) {
    if (pxData[i] < 10 && pxData[i+1] < 10 && pxData[i+2] < 10) {
      pxData[i + 3] = 0; 
    } else if (pxData[i + 3] > 20) {
      pxData[i + 3] = 255; 
    }
  }
  ctx.putImageData(imgDataLayer, 0, 0);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceToProcess.width;
  tempCanvas.height = sourceToProcess.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  tempCtx.drawImage(sourceToProcess, 0, 0);
  const data = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;

  const blackPoint = parseInt(blackPointInput ? blackPointInput.value : 0, 10);
  const whitePoint = parseInt(whitePointInput ? whitePointInput.value : 255, 10);
  const gamma = parseFloat(gammaInput ? gammaInput.value : 1.0);
  const isInverted = invertToggle ? invertToggle.checked : false;
  const angleRad = (parseFloat(screenAngleInput ? screenAngleInput.value : 22.5) * Math.PI) / 180;
  const shape = dotShapeSelect ? dotShapeSelect.value : 'round';
  const lpi = parseInt(screenLpiInput ? screenLpiInput.value : 30, 10);
  const currentMethod = methodSelect ? methodSelect.value : 'standard';
  
  const cellSize = Math.max(3, Math.round(180 / lpi));

  if (currentMethod === 'stochastic_fade') {
    for (let y = 0; y < canvas.height; y += cellSize) {
      for (let x = 0; x < canvas.width; x += cellSize) {
        const jitterX = (Math.random() - 0.5) * (cellSize * 0.7);
        const jitterY = (Math.random() - 0.5) * (cellSize * 0.7);
        
        const cx = x + cellSize / 2 + jitterX;
        const cy = y + cellSize / 2 + jitterY;

        const sampleX = Math.min(Math.max(Math.floor(cx), 0), canvas.width - 1);
        const sampleY = Math.min(Math.max(Math.floor(cy), 0), canvas.height - 1);
        const idx = (sampleY * canvas.width + sampleX) * 4;

        if (data[idx + 3] < 20) continue;

        let r = data[idx], g = data[idx+1], b = data[idx+2];
        if (r < 10 && g < 10 && b < 10) continue;

        r = adjustChannel(r, blackPoint, whitePoint, gamma);
        g = adjustChannel(g, blackPoint, whitePoint, gamma);
        b = adjustChannel(b, blackPoint, whitePoint, gamma);

        if (isInverted) {
          r = 255 - r; g = 255 - g; b = 255 - b;
        }

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        
        if (luma > 15 && luma < 90) {
          let transitionFactor = (luma - 15) / 75; 
          let radius = transitionFactor * (cellSize * 0.35);

          if (radius > 0.15) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(angleRad);
            ctx.fillStyle = isInverted ? '#ffffff' : '#000000';

            ctx.beginPath();
            if (shape === 'round') {
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fill();
            } else if (shape === 'line') {
              const lineWidth = radius * 1.1;
              ctx.fillRect(-cellSize / 2, -lineWidth / 2, cellSize, lineWidth);
            }
            ctx.restore();
          }
        }
      }
    }
  } else if (currentMethod === 'diffusion') {
    const imgW = canvas.width;
    const imgH = canvas.height;
    const grayBuffer = new Float32Array(imgW * imgH);

    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      if (data[i+3] < 20) {
        grayBuffer[idx] = 255;
      } else {
        let r = adjustChannel(data[i], blackPoint, whitePoint, gamma);
        let g = adjustChannel(data[i+1], blackPoint, whitePoint, gamma);
        let b = adjustChannel(data[i+2], blackPoint, whitePoint, gamma);
        if (isInverted) { r = 255 - r; g = 255 - g; b = 255 - b; }
        grayBuffer[idx] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    const outputData = ctx.createImageData(imgW, imgH);
    const outPx = outputData.data;

    for (let y = 0; y < imgH; y++) {
      for (let x = 0; x < imgW; x++) {
        const idx = y * imgW + x;
        const oldPixel = grayBuffer[idx];
        const newPixel = oldPixel < 128 ? 0 : 255;
        const error = (oldPixel - newPixel) / 16;

        const outIdx = idx * 4;
        const val = isInverted ? (newPixel === 0 ? 255 : 0) : newPixel;
        
        if (data[idx * 4 + 3] > 20 && !(data[idx * 4] < 15 && data[idx * 4 + 1] < 15 && data[idx * 4 + 2] < 15)) {
          outPx[outIdx] = val;
          outPx[outIdx + 1] = val;
          outPx[outIdx + 2] = val;
          outPx[outIdx + 3] = 255;
        } else {
          outPx[outIdx + 3] = 0;
        }

        if (x + 1 < imgW) grayBuffer[idx + 1] += error * 7;
        if (y + 1 < imgH) {
          if (x > 0) grayBuffer[(y + 1) * imgW + x - 1] += error * 3;
          grayBuffer[(y + 1) * imgW + x] += error * 5;
          if (x + 1 < imgW) grayBuffer[(y + 1) * imgW + x + 1] += error * 1;
        }
      }
    }
    ctx.putImageData(outputData, 0, 0);

  } else {
    for (let y = 0; y < canvas.height; y += cellSize) {
      for (let x = 0; x < canvas.width; x += cellSize) {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        const sampleX = Math.min(Math.max(Math.floor(cx), 0), canvas.width - 1);
        const sampleY = Math.min(Math.max(Math.floor(cy), 0), canvas.height - 1);
        const idx = (sampleY * canvas.width + sampleX) * 4;

        if (data[idx + 3] < 20) continue;

        let r = data[idx], g = data[idx+1], b = data[idx+2];
        if (r < 20 && g < 20 && b < 20) continue;

        r = adjustChannel(r, blackPoint, whitePoint, gamma);
        g = adjustChannel(g, blackPoint, whitePoint, gamma);
        b = adjustChannel(b, blackPoint, whitePoint, gamma);

        if (isInverted) {
          r = 255 - r; g = 255 - g; b = 255 - b;
        }

        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
        let darkness = 1 - (luma / 255);
        let radius = darkness * (cellSize * 0.85);

        if (radius > 0.4 && luma < 110) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);
          ctx.fillStyle = isInverted ? '#ffffff' : '#000000';

          ctx.beginPath();
          if (shape === 'round') {
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (shape === 'line') {
            const lineWidth = radius * 1.5;
            ctx.fillRect(-cellSize / 2, -lineWidth / 2, cellSize, lineWidth);
          }
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

        downloadBtn.textContent = 'Descargar Imagen (300 DPI)';
        downloadBtn.disabled = false;
      }, 100);

    } catch (error) {
      console.error("Error al descargar:", error);
      alert("La imagen es demasiado grande para la memoria del navegador.");
      downloadBtn.textContent = 'Descargar Imagen (300 DPI)';
      downloadBtn.disabled = false;
    }
  });
}

const darkGarmentPresetBtn = document.getElementById('darkGarmentPresetBtn');
if (darkGarmentPresetBtn) {
  darkGarmentPresetBtn.addEventListener('click', () => {
    if (invertToggle) invertToggle.checked = !invertToggle.checked;
    
    if (invertToggle && invertToggle.checked) {
      darkGarmentPresetBtn.style.background = 'linear-gradient(135deg, #cfd9df 0%, #90a4ae 100%)';
      darkGarmentPresetBtn.style.color = '#0b0c10';
      darkGarmentPresetBtn.style.borderColor = '#ffffff';
    } else {
      darkGarmentPresetBtn.style.background = '#0b0c10';
      darkGarmentPresetBtn.style.color = '#ffffff';
      darkGarmentPresetBtn.style.borderColor = '#90a4ae';
    }

    if (loadedImage) processHalftone();
  });
}
