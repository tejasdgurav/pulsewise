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
    key: "rzp_live_ewrzTufDiddrHg",  // Replace with your Razorpay API key
    amount: 700,                     // Amount in paise (e.g., ₹7.00 = 700 paise)
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

/***** 6. Process the Report & Send Data to Backend for AI Summarization *****/
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
  // If the file is a PDF, you might use pdf.js; here we simulate text extraction.
  else if (selectedFile.type === "application/pdf") {
    // For a production system, integrate pdf.js for real text extraction.
    extractedText = "Simulated extracted text from PDF.";
  } else {
    extractedText = "Unsupported file type.";
  }

  // Prepare final data payload to send to the backend.
  // Note: We no longer send an AI summary from the client.
  const payload = {
    userEmail: currentUser.email,
    paymentId: paymentId,
    originalFileName: selectedFile.name,
    extractedText: extractedText
  };

  // Call the Google Apps Script endpoint – update the URL below with your deployed endpoint.
  fetch("https://script.google.com/macros/s/AKfycbwCIlImDg-nqqP02JtVfaCJwIHIbaw1vCq37BELLGcl9-9FDmtvJ3SS6cWegvQGmXjM/exec", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then((res) => res.json())
  .then((data) => {
    console.log("Backend response:", data);
    if (data.result === "success" && data.aiSummary) {
      // After backend processing, automatically generate and download the PDF.
      downloadPDF(data.aiSummary);
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
  
  // Automatically trigger the download of the PDF.
  doc.save("Pulsewise_Report.pdf");
}