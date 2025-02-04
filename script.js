// Import Firebase modules (using ES modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Firebase configuration – replace with your own details
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

// Get DOM Elements
const googleSigninBtn = document.getElementById("google-signin-btn");
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");

let currentUser = null;
let selectedFile = null;

// --- 1. Google Sign-In ---
googleSigninBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    googleSigninBtn.textContent = "Signed in as " + currentUser.displayName;
  } catch (error) {
    console.error("Sign-in error:", error);
    alert("Error signing in");
  }
});

// --- 2. File Upload & Drag-and-Drop Handling ---
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

// --- 3. Razorpay Payment Integration ---
function initiatePayment() {
  if (!currentUser) {
    alert("Please sign in with Google first.");
    return;
  }

  const options = {
    key: "rzp_live_ewrzTufDiddrHg",  // Replace with your Razorpay API key
    amount: 700,                     // Amount in paise (₹7.00 = 700 paise)
    currency: "INR",
    name: "Pulsewise",
    description: "AI Blood Report Analysis",
    prefill: { email: currentUser.email },
    handler: function (response) {
      const paymentId = response.razorpay_payment_id;
      processReport(paymentId);
    },
    theme: { color: "#0070f3" }
  };
  const rzp = new Razorpay(options);
  rzp.open();
}

// --- 4. Process the Report & Send Data to Backend ---
async function processReport(paymentId) {
  if (!selectedFile) {
    alert("No file selected.");
    return;
  }

  let extractedText = "";
  // If the file is an image, perform OCR using Tesseract.js.
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
  // For PDFs, you can integrate pdf.js for real extraction.
  else if (selectedFile.type === "application/pdf") {
    // For this lean version, we simulate text extraction.
    extractedText = "Simulated extracted text from PDF.";
  } else {
    extractedText = "Unsupported file type.";
  }

  // Prepare payload (note: we do not include AI summary—the backend will generate it)
  const payload = {
    userEmail: currentUser.email,
    paymentId: paymentId,
    originalFileName: selectedFile.name,
    extractedText: extractedText
  };

  try {
    const res = await fetch("https://script.google.com/macros/s/AKfycbyv9m2sDrHunQj_PKXGFHzWGoIgPFYKY40LjNloT9H0s4c8xZzWafGZyJdVq3IoGYCT/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Backend response:", data);
    if (data.result === "success" && data.aiSummary) {
      downloadPDF(data.aiSummary);
    } else {
      alert("Error processing report on backend.");
    }
  } catch (error) {
    console.error("Error sending data to backend:", error);
    alert("Error processing your report.");
  }
}

// --- 5. Generate & Download PDF using jsPDF ---
function downloadPDF(summaryText) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Pulsewise - AI Blood Report Summary", 20, 20);
  doc.setFontSize(12);
  doc.text(summaryText, 20, 40, { maxWidth: 170 });
  doc.save("Pulsewise_Report.pdf");
}
