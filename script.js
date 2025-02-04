// Import Firebase modules (using ES modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase configuration – REPLACE with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyBgGoJ2s9KN3YNtS3ZY9sb3GlwoPQp8kak",
  authDomain: "pulsewise-ff8e7.firebaseapp.com",
  projectId: "pulsewise-ff8e7",
  storageBucket: "pulsewise-ff8e7.appspot.com",
  messagingSenderId: "595991869636",
  appId: "1:595991869636:web:d496baec48a18460773191",
  measurementId: "G-WT76Z1EQTM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Get DOM elements
const googleSigninBtn = document.getElementById("google-signin-btn");
const myReportsBtn = document.getElementById("my-reports-btn");
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");
const statusMessage = document.getElementById("status-message");
const dashboard = document.getElementById("dashboard");
const reportsList = document.getElementById("reports-list");

let currentUser = null;
let selectedFile = null;

// --- Google Sign-In ---
googleSigninBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    googleSigninBtn.textContent = "Signed in as " + currentUser.displayName;
    myReportsBtn.classList.remove("hidden");
  } catch (error) {
    console.error("Sign-in error:", error);
    alert("Error signing in");
  }
});

// --- File Upload & Drag-and-Drop Handling ---
uploadArea.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) {
    selectedFile = e.target.files[0];
    initiatePayment();
  }
});

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
  if (e.dataTransfer.files.length) {
    selectedFile = e.dataTransfer.files[0];
    initiatePayment();
  }
});

// --- Razorpay Payment Integration ---
function initiatePayment() {
  if (!currentUser) {
    alert("Please sign in with Google first.");
    return;
  }
  statusMessage.textContent = "Launching payment gateway...";
  const options = {
    key: "rzp_live_ewrzTufDiddrHg", // REPLACE with your Razorpay API key
    amount: 100,                   // ₹1.00 = 100 paise
    currency: "INR",
    name: "Pulsewise",
    description: "AI Blood Report Analysis",
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

// --- Process the Report & Send Data to Backend ---
async function processReport(paymentId) {
  if (!selectedFile) {
    alert("No file selected.");
    return;
  }
  let extractedText = "";
  // If image, use Tesseract OCR
  if (selectedFile.type.startsWith("image/")) {
    try {
      const { data: { text } } = await Tesseract.recognize(selectedFile, "eng");
      extractedText = text;
    } catch (error) {
      console.error("OCR error:", error);
      alert("Error processing image.");
      return;
    }
  } else if (selectedFile.type === "application/pdf") {
    // For PDFs, integrate pdf.js for real extraction; here we simulate.
    extractedText = "Simulated extracted text from PDF.";
  } else {
    extractedText = "Unsupported file type.";
  }
  
  // Prepare payload (do not include AI summary—the backend will generate it)
  const payload = {
    userEmail: currentUser.email,
    paymentId: paymentId,
    originalFileName: selectedFile.name,
    extractedText: extractedText
  };
  
  try {
    const res = await fetch("https://script.google.com/macros/s/AKfycbwLDYvlD7hRk237QPQ-3OK4e6gK9chz9UR1hr_6ccd8wfJ1PgyIdEi5xr1kpKFVBG0o/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Backend response:", data);
    if (data.result === "success" && data.aiSummary) {
      statusMessage.textContent = "Report processed. Downloading PDF...";
      downloadPDF(data.aiSummary);
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

// --- Generate & Download PDF using jsPDF ---
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

// --- Dashboard: Fetch & Display User Reports ---
myReportsBtn.addEventListener("click", () => {
  if (!currentUser) {
    alert("Please sign in first.");
    return;
  }
  fetchReports(currentUser.email);
});

async function fetchReports(userEmail) {
  statusMessage.textContent = "Loading your reports...";
  try {
    const res = await fetch(`https://script.google.com/macros/s/AKfycbwLDYvlD7hRk237QPQ-3OK4e6gK9chz9UR1hr_6ccd8wfJ1PgyIdEi5xr1kpKFVBG0o/exec?action=getReports&userEmail=${encodeURIComponent(userEmail)}`);
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
  if (reports.length === 0) {
    reportsList.innerHTML = "<p>No reports found.</p>";
    return;
  }
  reports.forEach(report => {
    const item = document.createElement("div");
    item.className = "report-item";
    // Assume report has keys: Timestamp, Original File Name, PDF URL
    const ts = new Date(report["Timestamp"]);
    item.innerHTML = `<strong>${ts.toLocaleString()}</strong><br>
      <em>${report["Original File Name"]}</em><br>
      <a href="${report["PDF URL"]}" target="_blank">View PDF Report</a>`;
    reportsList.appendChild(item);
  });
}
