// REPLACE THIS with the actual Apps Script web app URL
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxwvSxx0PGuHIe4fJG_KZzc02_GRZB8EVtoHBxX-OR-hiCRx26iZwvw0khisfh9aD68/exec";

// Track the user’s selected file
let selectedFile = null;

window.addEventListener('load', () => {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const processBtn = document.getElementById('processBtn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');

  // Click upload area => open file picker
  uploadArea.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
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
    fileInput.files = e.dataTransfer.files; // so we see it in the input
  });

  // Process button
  processBtn.addEventListener('click', () => {
    if (!selectedFile) {
      statusEl.textContent = "Please select a file first.";
      return;
    }
    processFile(selectedFile);
  });

  async function processFile(file) {
    statusEl.textContent = "Extracting text with Tesseract... please wait.";
    resultEl.innerHTML = "";

    try {
      // Run OCR in browser
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      console.log("Extracted text:", text);

      statusEl.textContent = "Sending to Apps Script for AI summary...";

      // Send extracted text to Apps Script
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractedText: text,
          // filename: file.name  // optional, if you want to pass the original filename
        })
      });

      const result = await response.json();
      if (result.success) {
        statusEl.textContent = "Analysis complete!";
        resultEl.innerHTML = `
          <p><strong>Report ID:</strong> ${result.reportId}</p>
          <p><strong>PDF Link:</strong> <a href="${result.pdfUrl}" target="_blank">${result.pdfUrl}</a></p>
          <h3>AI Summary</h3>
          <pre>${result.summary}</pre>
        `;
      } else {
        statusEl.textContent = "Error from server: " + (result.error || "Unknown");
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error: " + err.message;
    }
  }
});
