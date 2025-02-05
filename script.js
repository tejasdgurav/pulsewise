const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyss7RWTiFpW9SDlL0ONFIu_iEN4rnSccNaM62-pPD5VebCrns114BjpZGio7Wkdgto/exec";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3/build/pdf.worker.min.js";

let selectedFile = null;

window.addEventListener('load', () => {
  const dropArea = document.getElementById('dropArea');
  const fileInput = document.getElementById('fileInput');
  const goBtn = document.getElementById('goBtn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');

  dropArea.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => {
    selectedFile = e.target.files[0];
  });

  dropArea.addEventListener('dragover', e => {
    e.preventDefault(); dropArea.classList.add('highlight');
  });
  dropArea.addEventListener('dragleave', e => {
    e.preventDefault(); dropArea.classList.remove('highlight');
  });
  dropArea.addEventListener('drop', e => {
    e.preventDefault(); dropArea.classList.remove('highlight');
    selectedFile = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;
  });

  goBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      statusEl.textContent = "No file chosen.";
      return;
    }
    statusEl.textContent = "Working...";
    resultEl.innerHTML = "";

    let text = "";
    try {
      if (selectedFile.type.toLowerCase().includes("pdf")) {
        text = await ocrPdf(selectedFile);
      } else {
        text = await ocrImage(selectedFile);
      }
    } catch (err) {
      statusEl.textContent = "OCR error: " + err.message;
      return;
    }

    statusEl.textContent = "Sending to AI...";
    try {
      const fd = new FormData();
      fd.append("extractedText", text);
      const res = await fetch(APPS_SCRIPT_URL, { method: "POST", body: fd });
      const js = await res.json();
      if (js.success) {
        statusEl.textContent = "Done!";
        resultEl.innerHTML = `
          <p><strong>Summary:</strong> ${js.summary}</p>
          <p><strong>PDF:</strong> <a href="${js.pdfUrl}" target="_blank">Open</a></p>
        `;
      } else {
        statusEl.textContent = "Server error: " + (js.error || "Unknown");
      }
    } catch (e) {
      statusEl.textContent = "Request error: " + e.message;
    }
  });
});

async function ocrPdf(file) {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  let finalText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const viewport = page.getViewport({ scale:1.5 });
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataURL = canvas.toDataURL('image/png');
    const { data:{ text } } = await Tesseract.recognize(dataURL, 'eng');
    finalText += text + "\n";
  }
  return finalText;
}

async function ocrImage(file) {
  const ab = await file.arrayBuffer();
  const { data:{ text } } = await Tesseract.recognize(ab, 'eng');
  return text;
}
