/***** 1. Firebase Initialization *****/
// Replace these with your actual Firebase config values.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  // ... additional config values as needed
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/***** 2. DOM Elements *****/
const loginBtn = document.getElementById('login-btn');
const authSection = document.getElementById('auth-section');
const uploadSection = document.getElementById('upload-section');
const fileInput = document.getElementById('file-input');
const processBtn = document.getElementById('process-btn');
const paymentSection = document.getElementById('payment-section');
const payBtn = document.getElementById('pay-btn');
const resultSection = document.getElementById('result-section');
const reportSummaryDiv = document.getElementById('report-summary');
const downloadBtn = document.getElementById('download-btn');

let structuredData = {};    // Structured JSON data from the blood report.
let finalSummary = "";      // Final AI-generated summary.
let userEmail = "";         // User email from Firebase auth.
let originalFileName = "";  // Name of the uploaded file.
let paymentId = "";         // Razorpay payment ID after successful payment.

/***** 3. Authentication (Google Sign-In) *****/
loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      userEmail = result.user.email;
      authSection.classList.add('hidden');
      uploadSection.classList.remove('hidden');
    })
    .catch(err => console.error("Auth Error:", err));
});

/***** 4. File Upload & OCR Processing *****/
processBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a file to upload.");
    return;
  }
  originalFileName = file.name;
  let extractedText = "";

  // If image: use Tesseract.js for OCR.
  if (file.type.startsWith("image/")) {
    try {
      const { data: { text } } = await Tesseract.recognize(file, "eng");
      extractedText = text;
    } catch (error) {
      console.error("Image OCR error:", error);
      alert("Error processing image. Please try again.");
      return;
    }
  }
  // If PDF: use PDF.js for text extraction.
  else if (file.type === "application/pdf") {
    try {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(" ");
        }
        extractedText = fullText;
        parseExtractedText(extractedText);
      };
      fileReader.readAsArrayBuffer(file);
      return; // Wait for the onload callback.
    } catch (error) {
      console.error("PDF extraction error:", error);
      alert("Error processing PDF. Please try again.");
      return;
    }
  } else {
    alert("Unsupported file type. Please upload a PDF or an image.");
    return;
  }
  // For image files, process immediately.
  parseExtractedText(extractedText);
});

/***** 5. Parsing & AI Summarization *****/
function parseExtractedText(text) {
  // A basic parser: expects lines like "Hemoglobin: 13.5 g/dL"
  const lines = text.split("\n");
  structuredData = {};
  lines.forEach(line => {
    const parts = line.split(":");
    if (parts.length === 2) {
      structuredData[parts[0].trim()] = parts[1].trim();
    }
  });
  // Simulate an AI summary – in production, call your AI API here.
  finalSummary = "The blood report indicates that all key parameters are within normal ranges. Hemoglobin, white cell count, and platelets are consistent with a healthy profile.";
  
  // Move to payment step.
  uploadSection.classList.add("hidden");
  paymentSection.classList.remove("hidden");
}

/***** 6. Razorpay Payment Integration *****/
payBtn.addEventListener("click", () => {
  const options = {
    "key": "YOUR_RAZORPAY_KEY",  // Replace with your Razorpay key.
    "amount": 5000,              // Amount in paise (e.g., ₹50.00).
    "currency": "INR",
    "name": "Pulsewise",
    "description": "AI Blood Report Analysis",
    "handler": function (response) {
      // Capture payment ID.
      paymentId = response.razorpay_payment_id;
      // On successful payment, finalize and store the report.
      paymentSection.classList.add("hidden");
      finalizeReport();
    },
    "prefill": {
      "email": userEmail,
    },
    "theme": {
      "color": "#0070f3"
    }
  };
  const rzp1 = new Razorpay(options);
  rzp1.open();
});

/***** 7. Final Report Submission & Storage *****/
function finalizeReport() {
  // Create a payload with all final details.
  const payload = {
    userEmail,
    finalSummary,
    structuredData,
    paymentId,
    originalFileName
  };
  // Call the Google Apps Script endpoint.
  fetch('https://script.google.com/macros/s/YOUR_APPS_SCRIPT_DEPLOYED_URL/exec', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
    // Expecting a response with URLs for PDF and JSON.
    console.log("Storage success:", data);
    reportSummaryDiv.innerText = finalSummary;
    resultSection.classList.remove("hidden");
  })
  .catch(error => {
    console.error("Error storing report:", error);
    alert("Error finalizing report. Please try again later.");
  });
}

/***** 8. Optional Client-Side PDF Download *****/
downloadBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("Pulsewise - AI Blood Report Summary", 20, 20);
  doc.text(finalSummary, 20, 40);
  doc.save("Pulsewise_Report.pdf");
});
