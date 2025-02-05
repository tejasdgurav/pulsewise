// Replace with your actual Apps Script web app URL:
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwM7QNNjhQodHu4jcjhhAaWnvqhqr_pqSCLEuTWEUSJ7EwXaebX-4zKWsK02c7UpRam/exec";

// We store the selected file globally
let selectedFile = null;

window.addEventListener('load', () => {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const processBtn = document.getElementById('processBtn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');

  // Click event on upload area => open file dialog
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });
  // When user selects a file via dialog
  fileInput.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];
  });

  // Drag & drop events
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
      statusEl.textContent = 'Please select a file first.';
      return;
    }
    processFile(selectedFile);
  });

  async function processFile(file) {
    statusEl.textContent = 'Running OCR... please wait.';
    resultEl.innerHTML = '';

    try {
      // 1) Convert file to ArrayBuffer for Tesseract
      const arrayBuffer = await file.arrayBuffer();
      // 2) OCR with Tesseract in the browser
      const { data: { text } } = await Tesseract.recognize(arrayBuffer, 'eng');
      console.log('OCR Extracted Text:', text);

      statusEl.textContent = 'Sending text to AI backend...';
      // 3) Send extracted text to Apps Script
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedText: text })
      });
      const json = await resp.json();

      if (json.success) {
        statusEl.textContent = 'Analysis complete!';
        resultEl.innerHTML = `
          <h3>AI Summary</h3>
          <p>${json.summary}</p>
          <p><strong>PDF Link:</strong> <a href="${json.pdfUrl}" target="_blank">${json.pdfUrl}</a></p>
        `;
      } else {
        statusEl.textContent = 'Server Error: ' + (json.error || 'Unknown');
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error: ' + err.message;
    }
  }
});
