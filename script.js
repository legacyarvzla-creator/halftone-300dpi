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
const ctx = canvas.getContext('2d', { willReadFrequently: true });

let loadedImage = null;
let activeColorFilter = 'all';

window.resetInput = function(id, defaultValue) {
  const el = document.getElementById(id);
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

cropBgToggle.addEventListener('change', () => {
  if (cropBgToggle.checked) {
    cropThresholdGroup.style.opacity = '1';
    cropThresholdGroup.style.pointerEvents = 'auto';
  } else {
    cropThresholdGroup.style.opacity = '0.5';
    cropThresholdGroup.style.pointerEvents = 'none';
  }
  if (loadedImage) processHalftone();
});

cropThresholdInput.addEventListener('input', () => {
  cropThresholdValue.textContent = cropThresholdInput.value;
  if (loadedImage && cropBgToggle.checked) processHalftone();
});

colorModeSelect.addEventListener('change', () => {
  if (loadedImage) processHalftone();
});

screenLpiInput.addEventListener('input', () => {
  lpiVal.textContent = screenLpiInput.value;
  if (loadedImage) processHalftone();
});

screenAngleInput.addEventListener('input', () => {
  angleVal.textContent = screenAngleInput.value;
  if (loadedImage) processHalftone();
});

methodSelect.addEventListener('change', () => {
  if (loadedImage) processHalftone();
});

dotShapeSelect.addEventListener('change', () => {
  if (loadedImage) processHalftone();
});

invertToggle.addEventListener('change', () => {
  if (loadedImage) processHalftone();
});

blackPointInput.addEventListener('input', () => {
  blackPointVal.textContent = blackPointInput.value;
  if (loadedImage) processHalftone();
});

whitePointInput.addEventListener('input', () => {
  whitePointVal.textContent = whitePointInput.value;
  if (loadedImage) processHalftone();
});

gammaInput.addEventListener('input', () => {
  gammaVal.textContent = parseFloat(gammaInput.value).toFixed(2);
  if (loadedImage) processHalftone();
});

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      processHalftone();
      downloadBtn.disabled = false;
    };
    img.onerror = () => {
      alert("Error al cargar la imagen.");
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

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

function isTargetColor(r, g, b, filter) {
  if (filter === 'all') return true;
  if (filter === 'black') return (r < 80 && g < 80 && b < 80);
  if (filter === 'red') return (r > g + 40 && r > b + 40);
  if (filter === 'green') return (g > r + 40 && g > b + 40);
  if (filter === 'blue') return (b > r + 40 && b > g + 40);
  if (filter === 'yellow') return (r > 150 && g > 150 && b < 100);
  if (filter === 'pink') return (r > 150 && b > 120 && g < 130);
  if (filter === 'white') return (r > 200 && g > 200 && b > 200);
  return false;
}

function processHalftone() {
  let sourceToProcess = loadedImage;
  if (cropBgToggle.checked) {
    const thresholdVal = parseInt(cropThresholdInput.value, 10);
    sourceToProcess = getCroppedImageCanvas(loadedImage, thresholdVal);
  }

  canvas.width = sourceToProcess.width;
  canvas.height = sourceToProcess.height;

  // Limpiamos el canvas dejándolo 100% transparente al inicio
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sourceToProcess.width;
  tempCanvas.height = sourceToProcess.height;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  tempCtx.drawImage(sourceToProcess, 0, 0);
  
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const data = imageData.data;

  const blackPoint = parseInt(blackPointInput.value, 10);
  const whitePoint = parseInt(whitePointInput.value, 10);
  const gamma = parseFloat(gammaInput.value);
  const isInverted = invertToggle.checked;
  const isColorMode = colorModeSelect.value === 'color';
  const angleRad = (parseFloat(screenAngleInput.value) * Math.PI) / 180;
  const shape = dotShapeSelect.value;
  const lpi = parseInt(screenLpiInput.value, 10);
  const cellSize = Math.max(2, Math.round(150 / lpi));

  for (let y = 0; y < canvas.height; y += cellSize) {
    for (let x = 0; x < canvas.width; x += cellSize) {
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;

      const sampleX = Math.min(Math.max(Math.floor(cx), 0), canvas.width - 1);
      const sampleY = Math.min(Math.max(Math.floor(cy), 0), canvas.height - 1);
      const idx = (sampleY * canvas.width + sampleX) * 4;

      if (data[idx + 3] < 20) continue;

      let r = data[idx], g = data[idx+1], b = data[idx+2];

      // Si es negro puro o fondo oscuro, se omite (queda transparente)
      if (r < 25 && g < 25 && b < 25) continue;

      if (activeColorFilter !== 'all') {
        if (!isTargetColor(r, g, b, activeColorFilter)) continue;
      }

      r = adjustChannel(r, blackPoint, whitePoint, gamma);
      g = adjustChannel(g, blackPoint, whitePoint, gamma);
      b = adjustChannel(b, blackPoint, whitePoint, gamma);

      if (isInverted) {
        r = 255 - r; g = 255 - g; b = 255 - b;
      }

      let luma = 0.299 * r + 0.587 * g + 0.114 * b;

      // Aplicar tramado SOLO en zonas de degradé (transiciones)
      if (luma > 25 && luma < 230) {
        let brightness = luma / 255;
        let radius = (1 - brightness) * (cellSize / 2);

        if (radius > 0.3) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);
          ctx.fillStyle = isColorMode ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` : (isInverted ? '#ffffff' : '#000000');
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

const darkGarmentPresetBtn = document.getElementById('darkGarmentPresetBtn');
if (darkGarmentPresetBtn) {
  darkGarmentPresetBtn.addEventListener('click', () => {
    invertToggle.checked = !invertToggle.checked;
    
    if (invertToggle.checked) {
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

