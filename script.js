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

// Controles de Zoom
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
    if (!file)
