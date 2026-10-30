const imageInput = document.getElementById('imageInput');
const dotSizeInput = document.getElementById('dotSize');
const dotValue = document.getElementById('dotValue');
const dotShapeSelect = document.getElementById('dotShape');
const downloadBtn = document.getElementById('downloadBtn');

// Controles de recorte
const cropBgToggle = document.getElementById('cropBgToggle');
const cropThresholdInput = document.getElementById('cropThreshold');
const cropThresholdValue = document.getElementById('cropThresholdValue');
const cropThresholdGroup = document.getElementById('cropThresholdGroup');

// Controles de Niveles (Tone Curve)
const blackPointInput = document.getElementById('blackPoint');
const blackPointVal = document.getElementById('blackPointVal');
const whitePointInput = document.getElementById('whitePoint');
const whitePointVal = document.getElementById('whitePointVal');
const gammaInput = document.getElementById('gammaInput');
const gammaVal = document.getElementById('gammaVal');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let loadedImage = null;
let dotColor = '#000000';
let bgColor = '#ffffff';

// Función global para los botones de reinicio (↺)
window.resetInput = function(id, defaultValue) {
  const el = document.getElementById(id);
  el.value = defaultValue;
  el.dispatchEvent(new Event('input'));
};

// Eventos de interfaz
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
      processHalftone();
      downloadBtn.disabled = false;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

dotSizeInput.addEventListener('input', () => {
  dotValue.textContent = dotSizeInput.value;
  if (loadedImage) processHalftone();
});

dotShapeSelect.addEventListener('change', () => {
  if (loadedImage) processHalftone();
});

// Función de recorte automático
function getCroppedImageCanvas(img, threshold) {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
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
      if (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold) {
        top = y;
        break toping;
      }
    }
  }

  bottoming: for (let y = height - 1; y >= top; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold) {
        bottom = y + 1;
        break bottoming;
      }
    }
  }

  lefting: for (let x = 0; x < width; x++) {
    for (let y = top; y < bottom; y++) {
      const idx = (y * width + x) * 4;
      if (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold) {
        left = x;
        break lefting;
      }
    }
  }

  righting: for (let x = width - 1; x >= left; x--) {
    for (let y = top; y < bottom; y++) {
      const idx = (y * width + x) * 4;
      if (data[idx] > threshold || data[idx+1] > threshold || data[idx+2] > threshold) {
        right = x + 1;
        break righting;
      }
    }
  }

  const croppedWidth = right - left;
  const croppedHeight = bottom - top;
  if (croppedWidth <= 0 || croppedHeight <= 0) return img;

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCanvas.width = croppedWidth;
  croppedCanvas.height = croppedHeight;
  croppedCtx.drawImage(tempCanvas, left, top, croppedWidth, croppedHeight, 0, 0, croppedWidth, croppedHeight);

  return croppedCanvas;
}

function processHalftone() {
  const gridSpacing = parseInt(dotSizeInput.value, 10);
  const shape = dotShapeSelect.value;
  
  // Valores de Niveles
  const blackPoint = parseInt(blackPointInput.value, 10);
  const whitePoint = parseInt(whitePointInput.value, 10);
  const gamma = parseFloat(gammaInput.value);

  let sourceToProcess = loadedImage;
  if (cropBgToggle.checked) {
    const thresholdVal = parseInt(cropThresholdInput.value, 10);
    sourceToProcess = getCroppedImageCanvas(loadedImage, thresholdVal);
  }

  canvas.width = sourceToProcess.width;
  canvas.height = sourceToProcess.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceToProcess, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dotColor;

  for (let y = 0; y < canvas.height; y += gridSpacing) {
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      const pixelX = Math.min(x + Math.floor(gridSpacing / 2), canvas.width - 1);
      const pixelY = Math.min(y + Math.floor(gridSpacing / 2), canvas.height - 1);
      const index = (pixelY * canvas.width + pixelX) * 4;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      if (a < 20) continue;

      // 1. Luminancia base (0 a 255)
      let luma = 0.299 * r + 0.587 * g + 0.114 * b;

      // 2. Aplicar Niveles (Black Point, White Point y Gamma estilo Photoshop)
      if (whitePoint > blackPoint) {
        luma = (luma - blackPoint) / (whitePoint - blackPoint);
      } else {
        luma = 0;
      }

      luma = Math.max(0, Math.min(1, luma)); // Limitar entre 0 y 1

      if (gamma !== 1) {
        luma = Math.pow(luma, 1 / gamma);
      }

      // 3. Calcular tamaño del punto basado en el brillo ajustado
      const radius = (1 - luma) * (gridSpacing / 2);

      if (radius > 0.4) {
        ctx.beginPath();
        if (shape === 'circle') {
          ctx.arc(x + gridSpacing / 2, y + gridSpacing / 2, radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'square') {
          const size = radius * 2;
          ctx.fillRect(
            (x + gridSpacing / 2) - radius,
            (y + gridSpacing / 2) - radius,
            size,
            size
          );
        }
      }
    }
  }
}

// Funciones para mantener los DPI al descargar
function setPngDpi(dataUrl, dpi = 300) {
  const ppm = Math.round(dpi / 0.0254);
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const insertIndex = 33;
  const physChunk = new Uint8Array(18);
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
  const originalDataUrl = canvas.toDataURL('image/png');
  const dpiDataUrl = setPngDpi(originalDataUrl, 300);

  const link = document.createElement('a');
  link.download = 'semitono_ajustado_300dpi.png';
  link.href = dpiDataUrl;
  link.click();
});
