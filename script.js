/************************************************************
 * Pulsewise Front-End Script
 * Final Working Code
 ************************************************************/

/** 
 * Firebase modules (ES modules) - typically loaded in HTML:
 *   <script type="module" src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js"></script>
 *   <script type="module" src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"></script>
 *
 * If you're including them directly, you won't need to import here,
 * but if you want to do so, you'll need to ensure your environment supports ES modules.
 */

// (Uncomment these if using ES modules in your build system)
// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
// import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

/**
 * -------------------------
 *  Global Configuration
 * -------------------------
 * Replace these with your own values.
 */
const CONFIG = {
  firebase: {
    apiKey: "AIzaSyBgGoJ2s9KN3YNtS3ZY9sb3GlwoPQp8kak",
    authDomain: "pulsewise-ff8e7.firebaseapp.com",
    projectId: "pulsewise-ff8e7",
    storageBucket: "pulsewise-ff8e7.appspot.com",
    messagingSenderId: "595991869636",
    appId: "1:595991869636:web:d496baec48a1846077319",
    measurementId: "G-WT76Z1EQTM"
  },
  razorpay: {
    key: "rzp_live_8cnyH5yfjbgDRD", // <-- Replace with your Razorpay live key
    amount: 100,                   // e.g., ₹1.00 = 100 paise
    currency: "INR",
    name: "Pulsewise",
    description: "AI Blood Report Analysis"
  },
  appsScriptURL: "https://script.google.com/macros/s/AKfycbwRJYnnBwdll57OUy_vIDyEOhrHDaEOZOyjKTId8XH7BucHTT_opr_ZDVH7ZI3For_i/exec" 
    // <-- Replace with your deployed Apps Script URL
};

/**
 * -------------------------
 *  DOM Elements
 * -------------------------
 */
const googleSigninBtn = document.getElementById("google-signin-btn");
const myReportsBtn = document.getElementById("my-reports-btn");
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");
const statusMessage = document.getElementById("status-message");
const dashboard = document.getElementById("dashboard");
const reportsList = document.getElementById("reports-list");

// Global state
let currentUser = null;
let selectedFile = null;

/* -----------------------------------------------------
   1) Firebase Initialization
------------------------------------------------------ */
function initFirebase() {
  const app = firebase.initializeApp(CONFIG.firebase);
  const auth = firebase.auth(app);
  const provider = new firebase.auth.GoogleAuthProvider();

  // Expose globally if needed
  window._pulsewiseAuth = auth;
  window._pulsewiseProvider = provider;
}

/* -----------------------------------------------------
   2) Google Sign-In
------------------------------------------------------ */
async function handleGoogleSignIn() {
  const auth = window._pulsewiseAuth;
  const provider = window._pulsewiseProvider;

  try {
    const result = await auth.signInWithPopup(provider);
    currentUser = result.user;
    googleSigninBtn.textContent = `Signed in as ${currentUser.displayName}`;
    myReportsBtn.classList.remove("hidden");
    console.log("User signed in:", currentUser.email);
  } catch (error) {
    console.error("Sign-in error:", error);
    alert("Error signing in. Please try again.");
  }
}

/* -----------------------------------------------------
   3) File Upload & Drag-and-Drop
------------------------------------------------------ */
function initFileUploadEvents() {
  // Clicking on upload area triggers file input
  uploadArea.addEventListener("click", () => fileInput.click());

  // When a file is chosen
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length) {
      selectedFile = e.target.files[0];
      initiatePayment(); // Start payment flow immediately
    }
  });

  // Drag over
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  // Drag leave
  uploadArea.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
  });

  // File drop
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      selectedFile = e.dataTransfer.files[0];
      initiatePayment();
    }
  });
}

/* -----------------------------------------------------
   4) Razorpay Payment
------------------------------------------------------ */
function initiatePayment() {
  if (!currentUser) {
    alert("Please sign in with Google first.");
    return;
  }

  statusMessage.textContent = "Launching payment gateway...";

  const options = {
    key: CONFIG.razorpay.key,
    amount: CONFIG.razorpay.amount,
    currency: CONFIG.razorpay.currency,
    name: CONFIG.razorpay.name,
    description: CONFIG.razorpay.description,
    prefill: { email: currentUser.email },
    handler: function (response) {
      const paymentId = response.razorpay_payment_id;
      statusMessage.textContent = "Payment successful. Processing report...";
      processReport(paymentId);
    },
    modal: {
      ondismiss: function () {
        statusMessage.textContent = "";
        alert("Payment cancelled.");
      }
    },
    theme: { color: "#0070f3" }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

/* -----------------------------------------------------
   5) Process the File - OCR & Backend Call
------------------------------------------------------ */
async function processReport(paymentId) {
  if (!selectedFile) {
    alert("No file selected.");
    return;
  }

  let extractedText = "";

  // OCR if image
  if (selectedFile.type.startsWith("image/")) {
    try {
      const { data: { text } } = await Tesseract.recognize(selectedFile, "eng");
      extractedText = text;
    } catch (error) {
      console.error("OCR error:", error);
      alert("Error processing image.");
      return;
    }
  } 
  // If PDF, for now we simulate text or parse client-side if you have a library
  else if (selectedFile.type === "application/pdf") {
    extractedText = "Simulated extracted text from PDF.";
  } 
  else {
    alert("Unsupported file type. Please upload a PDF or image file.");
    return;
  }

  // Build payload
  const payload = {
    userEmail: currentUser.email,
    paymentId: paymentId,
    originalFileName: selectedFile.name,
    extractedText: extractedText
  };

  // Send to Apps Script
  try {
    const res = await fetch(CONFIG.appsScriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Backend response:", data);

    if (data.result === "success" && data.aiSummary) {
      statusMessage.textContent = "Report processed. Downloading PDF...";
      downloadPDF(data.aiSummary); 
      // Alternatively, you can use data.pdfUrl from server if you want to download the Drive PDF
    } else {
      alert("Error processing report on backend.");
      statusMessage.textContent = "";
    }
  } catch (error) {
    console.error("Error sending data to backend:", error);
    alert("Error processing your report.");
    statusMessage.textContent = "";
  }
}

/* -----------------------------------------------------
   6) Local PDF Download with jsPDF (Optional)
------------------------------------------------------ */
function downloadPDF(summaryText) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Pulsewise - AI Blood Report Summary", 20, 20);
  doc.setFontSize(12);
  doc.text(summaryText, 20, 40, { maxWidth: 170 });
  doc.save("Pulsewise_Report.pdf");
  statusMessage.textContent = "Report downloaded.";
}

/* -----------------------------------------------------
   7) Fetch & Display User Reports
------------------------------------------------------ */
async function fetchReports(userEmail) {
  statusMessage.textContent = "Loading your reports...";
  try {
    const url = `${CONFIG.appsScriptURL}?action=getReports&userEmail=${encodeURIComponent(userEmail)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.result === "success" && data.reports) {
      renderReports(data.reports);
      dashboard.classList.remove("hidden");
      statusMessage.textContent = "";
    } else {
      alert("No reports found or error fetching reports.");
      statusMessage.textContent = "";
    }
  } catch (error) {
    console.error("Error fetching reports:", error);
    alert("Error fetching your reports.");
    statusMessage.textContent = "";
  }
}

function renderReports(reports) {
  reportsList.innerHTML = "";

  if (!reports.length) {
    reportsList.innerHTML = "<p>No reports found.</p>";
    return;
  }

  reports.forEach(report => {
    const item = document.createElement("div");
    item.className = "report-item";

    const ts = new Date(report["Timestamp"]);
    item.innerHTML = `
      <strong>${ts.toLocaleString()}</strong><br>
      <em>${report["Original File Name"]}</em><br>
      <a href="${report["PDF URL"]}" target="_blank">View PDF Report</a>
    `;
    reportsList.appendChild(item);
  });
}

/* -----------------------------------------------------
   8) Button Click to Fetch Reports
------------------------------------------------------ */
function initReportButton() {
  myReportsBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please sign in first.");
      return;
    }
    fetchReports(currentUser.email);
  });
}

/* -----------------------------------------------------
   9) On Page Load - Initialize Everything
------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  // 1) Initialize Firebase
  initFirebase();

  // 2) Attach Sign-In event
  googleSigninBtn.addEventListener("click", handleGoogleSignIn);

  // 3) Initialize file upload events
  initFileUploadEvents();

  // 4) Init "My Reports" button
  initReportButton();
});
