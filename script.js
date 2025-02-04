/***** 1. Firebase Initialization *****/
// Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgGoJ2s9KN3YNtS3ZY9sb3GlwoPQp8kak",
  authDomain: "pulsewise-ff8e7.firebaseapp.com",
  // ...other Firebase config values
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/***** 2. DOM Elements *****/
const googleSigninBtn = document.getElementById("google-signin-btn");
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");

let currentUser = null;
let selectedFile = null;

/***** 3. Firebase Google Sign-In *****/
googleSigninBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      currentUser = result.user;
      googleSigninBtn.innerText = "Signed in as " + currentUser.displayName;
    })
    .catch((error) => {
      console.error("Error during sign in:", error);
      alert("Authentication failed.");
    });
});

/***** 4. File Upload & Drag-and-Drop Handling *****/
// When the upload area is clicked, trigger file input
uploadArea.addEventListener("click", () => {
  fileInput.click();
});

// When a file is selected via file input
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) {
    selectedFile = e.target.files[0];
    initiatePayment();
  }
});

// Drag-and-drop events for the upload area
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

/***** 5. Razorpay Payment Integration *****/
function initiatePayment() {
  // Require the user to be signed in first.
  if (!currentUser) {
    alert("Please sign in with Google first.");
    return;
  }

  const options = {
    key: "YOUR_RAZORPAY_KEY",  // Replace with your Razorpay API key
    amount: 700,              // Amount in paise (e.g., ₹7.00 = 700 paise)
    currency: "INR",
    name: "Pulsewise",
    description: "AI Blood Report Analysis",
    prefill: {
      email: currentUser.email,
    },
    handler: function (response) {
      // When payment succeeds, proceed with report processing.
      const paymentId = response.razorpay_payment_id;
      processReport(paymentId);
    },
    theme: {
      color: "#0070f3"
    }
  };
  const rzp = new Razorpay(options);
  rzp.open();
}

/***** 6. Process the Report & Generate AI Summary *****/
// In this example, we simulate OCR and AI summarization on the client side.
// (You can integrate Tesseract.js and an AI API if desired.)
async function processReport(paymentId) {
  if (!selectedFile) {
    alert("No file selected.");
    return;
  }

  let extractedText = "";
  // If the file is an image, run OCR via Tesseract.js.
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
  // If PDF, you could use pdf.js; here we assume text extraction is done.
  else if (selectedFile.type === "application/pdf") {
    // For simplicity, we simulate text extraction.
    extractedText = "Simulated extracted text from PDF.";
  } else {
    extractedText = "Unsupported file type.";
  }

  // Simulate AI summarization – replace this with your own AI controller logic
  const aiSummary = "This is your AI-generated blood report summary. All key parameters are within normal limits.";

  // Prepare final data payload to send to the Google Apps Script backend.
  const payload = {
    userEmail: currentUser.email,
    paymentId: paymentId,
    originalFileName: selectedFile.name,
    aiSummary: aiSummary,
    extractedText: extractedText
  };

  // Call the Google Apps Script endpoint (update URL accordingly)
  fetch("https://script.google.com/macros/s/AKfycbwbkZYIHmwZGnupA6_TwusqkuU8CQHXio5p3_IYcnYa1yWgrWUBRKWwf4BI4p8mP4YK/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then((res) => res.json())
  .then((data) => {
    console.log("Backend response:", data);
    if (data.result === "success") {
      // After backend processing, automatically generate and download the PDF.
      downloadPDF(aiSummary);
    } else {
      alert("Error processing report on backend.");
    }
  })
  .catch((err) => {
    console.error("Error sending data to backend:", err);
    alert("Error processing your report.");
  });
}

/***** 7. Generate & Download PDF using jsPDF *****/
function downloadPDF(summaryText) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Pulsewise - AI Blood Report Summary", 20, 20);
  doc.setFontSize(12);
  doc.text(summaryText, 20, 40, { maxWidth: 170 });
  
  // Trigger download automatically
  doc.save("Pulsewise_Report.pdf");
}
