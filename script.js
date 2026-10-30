const imageInput = document.getElementById('imageInput');
const dotSizeInput = document.getElementById('dotSize');
const dotValue = document.getElementById('dotValue');
const dotShapeSelect = document.getElementById('dotShape');
const downloadBtn = document.getElementById('downloadBtn');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let loadedImage = null;

// Creamos controles adicionales dinámicamente si no están en el HTML, 
// o puedes agregarlos en tu HTML. Aquí manejaremos los valores por defecto:
let dotColor = '#000000'; // Color del punto por defecto (Negro)
let bgColor = '#ffffff';  // Color de fondo por defecto (Blanco)
let mode = 'bw';          // 'bw' (Blanco y Negro) o 'color' (Halftone a color CMYK/RGB)

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

function processHalftone() {
  const gridSpacing = parseInt(dotSizeInput.value, 10);
  const shape = dotShapeSelect.value;

  canvas.width = loadedImage.width;
  canvas.height = loadedImage.height;

  // Dibujar imagen original temporalmente para leer píxeles
  ctx.drawImage(loadedImage, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 1. Rellenar con el color de fondo elegido (ej: Blanco, Negro o transparente)
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Establecer el color de los puntos (ej: Negro, Blanco para DTF sobre negro, o colores)
  ctx.fillStyle = dotColor;

  // Dibujar la trama de semitonos
  for (let y = 0; y < canvas.height; y += gridSpacing) {
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      
      const pixelX = Math.min(x + Math.floor(gridSpacing / 2), canvas.width - 1);
      const pixelY = Math.min(y + Math.floor(gridSpacing / 2), canvas.height - 1);
      const index = (pixelY * canvas.width + pixelX) * 4;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3]; // Canal alfa (transparencia)

      // Si el píxel es totalmente transparente, lo ignoramos
      if (a < 20) continue;

      // Calcular brillo (Luminancia)
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      // Si trabajas con fondo negro e impresión en tinta blanca (efecto inverso):
      // Si el fondo es negro, las zonas oscuras de la imagen generan puntos (o viceversa).
      // Aquí usamos la lógica estándar: zonas oscuras = puntos grandes.
      const radius = (1 - brightness) * (gridSpacing / 2);

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

// Función para cambiar colores desde la interfaz si quieres agregarlos después
function updateColors(newDotColor, newBgColor) {
  dotColor = newDotColor;
  bgColor = newBgColor;
  if (loadedImage) processHalftone();
}

// Funciones para exportar a 300 DPI exactos con metadatos PNG (pHYs)
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
