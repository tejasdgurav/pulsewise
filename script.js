////////////////////////////////////////////////
// REPLACE this with your deployed Apps Script URL
////////////////////////////////////////////////
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzYDWQL3fvw9OLv92VFTox9jQuwsBde9LlkWo8W9kpdVAbO5YpHE_ZKBymMsi2Khyqr/exec";

// pdf.js: set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js";

let selectedFile = null;

window.addEventListener('load', () => {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const processBtn = document.getElementById('processBtn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');

  // Click -> file picker
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
  });

  // Drag & drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('highlight');
  });
  uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('highlight');
  });
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('highlight');
    selectedFile = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;
  });

  // Process button
  processBtn.addEventListener('click', () => {
    if (!selectedFile) {
      statusEl.textContent = 'Please select a PDF or image first.';
      return;
    }
    processFile(selectedFile);
  });

  // Main function: Convert PDF pages to images -> OCR -> send to Apps Script
  async function processFile(file) {
    statusEl.textContent = 'Starting OCR... Please wait.';
    resultEl.innerHTML = '';

    try {
      // If it's an image (jpg, png, etc.), we can directly pass it to Tesseract.
      // If it's a PDF, we convert each page to an image using pdf.js.
      const fileType = file.type.toLowerCase();

      let finalText = '';
      if (fileType.includes('pdf')) {
        // It's a PDF - convert each page to image data & OCR
        finalText = await ocrPdf(file);
      } else {
        // It's an image - OCR directly
        finalText = await ocrImage(file);
      }
      console.log('OCR extracted text:', finalText);

      statusEl.textContent = 'Sending text to AI backend...';

      // Send extracted text to Apps Script
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText: finalText })
      });
      const json = await response.json();

      if (json.success) {
        statusEl.textContent = 'Analysis complete!';
        resultEl.innerHTML = `
          <h3>AI Summary</h3>
          <p>${json.summary}</p>
          <p><strong>PDF Link:</strong> 
            <a href="${json.pdfUrl}" target="_blank">${json.pdfUrl}</a>
          </p>
        `;
      } else {
        statusEl.textContent = 'Server Error: ' + (json.error || 'Unknown');
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error: ' + err.message;
    }
  }

  /****************************************
   * ocrPdf(file)
   *  - Convert each PDF page to a canvas image, then OCR with Tesseract
   ****************************************/
  async function ocrPdf(file) {
    // Read as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    // Load PDF with pdf.js
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    let combinedText = '';

    for (let i = 1; i <= numPages; i++) {
      statusEl.textContent = `Rendering page ${i}/${numPages}...`;
      const page = await pdf.getPage(i);
      const scale = 1.5;  // adjust as needed
      const viewport = page.getViewport({ scale });

      // Create canvas, render page
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');

      // OCR the data URL
      statusEl.textContent = `OCR on page ${i}...`;
      const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');
      combinedText += text + '\n';
    }

    return combinedText;
  }

  /****************************************
   * ocrImage(file)
   *  - Directly OCR an image file (PNG/JPG/etc.)
   ****************************************/
  async function ocrImage(file) {
    const arrayBuffer = await file.arrayBuffer();
    // Tesseract can work with raw arrayBuffer for images
    const { data: { text } } = await Tesseract.recognize(arrayBuffer, 'eng');
    return text;
  }
});
