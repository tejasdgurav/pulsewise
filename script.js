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
    key: "rzp_live_8cnyH5yfjbgDRD",
    amount: 100,
    currency: "INR",
    name: "Pulsewise",
    description: "AI Blood Report Analysis"
  },
  appsScriptURL: "https://script.google.com/macros/s/AKfycbwRJYnnBwdll57OUy_vIDyEOhrHDaEOZOyjKTId8XH7BucHTT_opr_ZDVH7ZI3For_i/exec"
};

const googleSigninBtn = document.getElementById("google-signin-btn");
const myReportsBtn = document.getElementById("my-reports-btn");
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");
const statusMessage = document.getElementById("status-message");
const dashboard = document.getElementById("dashboard");
const reportsList = document.getElementById("reports-list");

let currentUser = null;
let selectedFile = null;

function initFirebase() {
  const app = firebase.initializeApp(CONFIG.firebase);
  const auth = firebase.auth(app);
  const provider = new firebase.auth.GoogleAuthProvider();
  window._pulsewiseAuth = auth;
  window._pulsewiseProvider = provider;
}

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

function initFileUploadEvents() {
  uploadArea.addEventListener("click", () => fileInput.click());
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
}

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
    prefill: {
      email: currentUser.email
    },
    handler: (response) => {
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

async function processReport(paymentId) {
  if (!selectedFile) {
    alert("No file selected.");
    return;
  }
  let extractedText = "";
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
    extractedText = "Simulated extracted text from PDF.";
  } else {
    alert("Unsupported file type. Please upload a PDF or image file.");
    return;
  }
  const payload = {
    userEmail: currentUser.email,
    paymentId: paymentId,
    originalFileName: selectedFile.name,
    extractedText: extractedText
  };
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
      <a href="${report['PDF URL']}" target="_blank">View PDF Report</a>
    `;
    reportsList.appendChild(item);
  });
}

function initReportButton() {
  myReportsBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("Please sign in first.");
      return;
    }
    fetchReports(currentUser.email);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initFirebase();
  googleSigninBtn.addEventListener("click", handleGoogleSignIn);
  initFileUploadEvents();
  initReportButton();
});
