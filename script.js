const imageInput = document.getElementById('imageInput');
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
const ctx = canvas.getContext('2d');

let loadedImage = null;

window.resetInput = function(id, defaultValue) {
  const el = document.getElementById(id);
  el.value = defaultValue;
  el.dispatchEvent(new Event('input'));
};

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
      processHalftone();
      downloadBtn.disabled = false;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

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

  const blackPoint = parseInt(blackPointInput.value, 10);
  const whitePoint = parseInt(whitePointInput.value, 10);
  const gamma = parseFloat(gammaInput.value);
  const isInverted = invertToggle.checked;

  const width = canvas.width;
  const height = canvas.height;
  const processedPixels = new Float32Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    const a = data[i+3];

    if (a < 20) {
      processedPixels[i / 4] = 255;
      continue;
    }

    let luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (whitePoint > blackPoint) {
      luma = (luma - blackPoint) / (whitePoint - blackPoint) * 255;
    }
    luma = Math.max(0, Math.min(255, luma));

    if (gamma !== 1) {
      let normalized = luma / 255;
      normalized = Math.pow(normalized, 1 / gamma);
      luma = normalized * 255;
    }

    // Si está marcado para prenda oscura, invertimos los valores tonales
    if (isInverted) {
      luma = 255 - luma;
    }

    processedPixels[i / 4] = luma;
  }

  // Fondo y color de puntos adaptados si se invierte
  ctx.fillStyle = isInverted ? '#000000' : '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = isInverted ? '#ffffff' : '#000000';

  const method = methodSelect.value;
  const lpi = parseInt(screenLpiInput.value, 10);
  const cellSize = Math.max(2, Math.round(150 / lpi));

  if (method === 'diffusion') {
    const imgOut = ctx.createImageData(width, height);
    const outData = imgOut.data;
    const buffer = new Float32Array(processedPixels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = buffer[idx];
        const newPixel = oldPixel < 128 ? 0 : 255;
        const error = oldPixel - newPixel;

        const outIdx = idx * 4;
        let val = newPixel;
        
        if (isInverted) {
          val = newPixel === 0 ? 255 : 0;
          outData[outIdx] = val;
          outData[outIdx+1] = val;
          outData[outIdx+2] = val;
          outData[outIdx+3] = val === 0 ? 0 : 255;
        } else {
          outData[outIdx] = val;
          outData[outIdx+1] = val;
          outData[outIdx+2] = val;
          outData[outIdx+3] = 255;
        }

        if (x + 1 < width) buffer[idx + 1] += error * 7 / 16;
        if (y + 1 < height) {
          if (x > 0) buffer[idx + width - 1] += error * 3 / 16;
          buffer[idx + width] += error * 5 / 16;
          if (x + 1 < width) buffer[idx + width + 1] += error * 1 / 16;
        }
      }
    }
    ctx.putImageData(imgOut, 0, 0);

  } else {
    const angleRad = (parseFloat(screenAngleInput.value) * Math.PI) / 180;
    const shape = dotShapeSelect.value;

    for (let y = 0; y < height; y += cellSize) {
      for (let x = 0; x < width; x += cellSize) {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        const sampleX = Math.min(Math.max(Math.floor(cx), 0), width - 1);
        const sampleY = Math.min(Math.max(Math.floor(cy), 0), height - 1);
        const luma = processedPixels[sampleY * width + sampleX];

        const brightness = luma / 255;
        const radius = (1 - brightness) * (cellSize / 2);

        if (radius > 0.3) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(angleRad);

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
  link.download = 'semitono_300dpi.png';
  link.href = dpiDataUrl;
  link.click();
});
