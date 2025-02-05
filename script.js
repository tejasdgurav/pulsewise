/////////////////////////////////////////////////////////
// REPLACE with your final Apps Script Web App URL
/////////////////////////////////////////////////////////
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwsBSd7cZNthun2BVR6fVJn4LhIeeCfExfhV-Qst54rRBBC5CCHbc-GIScsEhhIzrRM/exec";

// pdf.js worker path
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js";

let selectedFile = null;

window.addEventListener('load', () => {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const processBtn = document.getElementById('processBtn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');

  // Click -> open file picker
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });
  fileInput.addEventListener('change', e => {
    selectedFile = e.target.files[0];
  });

  // Drag & drop
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('highlight');
  });
  uploadArea.addEventListener('dragleave', e => {
    e.preventDefault();
    uploadArea.classList.remove('highlight');
  });
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('highlight');
    selectedFile = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;
  });

  // Process button
  processBtn.addEventListener('click', () => {
    if (!selectedFile) {
      statusEl.textContent = "No file selected.";
      return;
    }
    processFile(selectedFile);
  });

  async function processFile(file) {
    statusEl.textContent = "Reading file...";
    resultEl.innerHTML = "";

    try {
      // If it's a PDF, convert to image(s) with pdf.js; otherwise, OCR directly
      let finalText = "";
      if (file.type.toLowerCase().includes("pdf")) {
        finalText = await ocrPdf(file);
      } else {
        finalText = await ocrImage(file);
      }

      console.log("OCR Extracted Text:", finalText);
      statusEl.textContent = "Sending text to AI backend...";

      // Use FormData => no custom Content-Type => no preflight
      const formData = new FormData();
      formData.append("extractedText", finalText);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: formData
      });
      const json = await response.json();

      if (json.success) {
        statusEl.textContent = "Analysis complete!";
        resultEl.innerHTML = `
          <h3>AI Summary</h3>
          <p>${json.summary}</p>
          <p><strong>PDF Link:</strong> 
            <a href="${json.pdfUrl}" target="_blank">${json.pdfUrl}</a>
          </p>
        `;
      } else {
        statusEl.textContent = "Server Error: " + (json.error || "Unknown");
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error: " + err.message;
    }
  }

  /**
   * Convert PDF pages to images with pdf.js, then OCR each image with Tesseract
   */
  async function ocrPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    let combinedText = "";

    for (let i = 1; i <= numPages; i++) {
      statusEl.textContent = `Rendering page ${i}/${numPages}...`;
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      // Create a canvas for this page
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Convert to data URL
      const dataURL = canvas.toDataURL('image/png');

      // OCR
      statusEl.textContent = `OCR on page ${i}...`;
      const { data: { text } } = await Tesseract.recognize(dataURL, 'eng');
      combinedText += text + "\n";
    }

    return combinedText;
  }

  /**
   * OCR an image file (JPG, PNG, etc.) directly with Tesseract
   */
  async function ocrImage(file) {
    const arrayBuffer = await file.arrayBuffer();
    // Tesseract can read arrayBuffer for images
    const { data: { text } } = await Tesseract.recognize(arrayBuffer, 'eng');
    return text;
  }
});
