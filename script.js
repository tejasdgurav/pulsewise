/***********************
 * 1) Firebase Config
 ***********************/
const firebaseConfig = {
  apiKey: "AIzaSyBgGoJ2s9KN3YNtS3ZY9sb3GlwoPQp8kak",
  authDomain: "pulsewise-ff8e7.firebaseapp.com",
  projectId: "pulsewise-ff8e7",
  storageBucket: "pulsewise-ff8e7.appspot.com",
  messagingSenderId: "595991869636",
  appId: "1:595991869636:web:d496baec48a18460773191",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/********************************
 * 2) Global Vars & DOM Elements
 ********************************/
let currentUser = null;
let selectedFile = null;

// Replace with your deployed Google Apps Script Web App URL:
const webAppUrl = "https://script.google.com/macros/s/AKfycbywI8_xo_oNJ9NwW5h2GmZ1sHHu6CWqatjiaDAKrqRDHV_HiIYNjjMfsxTe_0i4JrAd/exec"; 

// DOM elements
const loginBtn     = document.getElementById("loginBtn");
const logoutBtn    = document.getElementById("logoutBtn");
const payBtn       = document.getElementById("payBtn");
const uploadSection= document.getElementById("uploadSection");
const statusSection= document.getElementById("statusSection");
const resultSection= document.getElementById("resultSection");
const pdfLink      = document.getElementById("pdfLink");

/***********************
 * 3) Auth Functions
 ***********************/
function signInGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      currentUser = result.user;
      console.log("Logged in as:", currentUser.email);
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    })
    .catch(error => {
      console.error("Login error:", error);
      alert("Error signing in.");
    });
}

function logout() {
  auth.signOut().then(() => {
    currentUser = null;
    console.log("User signed out");
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  });
}

// Track auth state
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    currentUser = null;
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
});

/*****************************
 * 4) File Drag & Drop
 *****************************/
function allowDrag(ev) {
  ev.preventDefault();
}

function handleDrop(ev) {
  ev.preventDefault();
  if (!currentUser) {
    alert("Please sign in before uploading.");
    return;
  }
  if (ev.dataTransfer.files && ev.dataTransfer.files.length > 0) {
    selectedFile = ev.dataTransfer.files[0];
    payBtn.classList.remove("hidden");
  }
}

function handleFileSelect(ev) {
  if (!currentUser) {
    alert("Please sign in before uploading.");
    return;
  }
  selectedFile = ev.target.files[0];
  if (selectedFile) {
    payBtn.classList.remove("hidden");
  }
}

/*****************************
 * 5) Payment (Razorpay)
 *****************************/
function initiatePayment() {
  if (!selectedFile) {
    alert("No file selected!");
    return;
  }
  if (!currentUser) {
    alert("Please sign in before payment.");
    return;
  }

  // Typically, you’d create an order from your backend to get order_id.
  // For simplicity, let’s create a random order_id or simulate it.
  const orderId = "ORDER_" + new Date().getTime();

  const options = {
    key: "rzp_live_8cnyH5yfjbgDRD", // Test or live key
    amount: 1 * 100, // e.g. INR 100. (100 = 1.00 in smallest currency unit)
    currency: "INR",
    name: "AI Blood Report Tool",
    description: "Blood Report Analysis Fee",
    order_id: orderId, // must be unique for each transaction
    handler: function (response) {
      // Payment successful
      console.log("Razorpay Payment ID:", response.razorpay_payment_id);
      // 1) Upload File to Apps Script
      uploadFileToAppsScript(response.razorpay_payment_id);
    },
    prefill: {
      email: currentUser.email,
      contact: "9999999999"
    },
    theme: {
      color: "#000000"
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}

/***************************************
 * 6) Upload File & Confirm Payment
 ***************************************/
async function uploadFileToAppsScript(paymentId) {
  // Show status
  statusSection.innerText = "Uploading file and confirming payment...";
  
  // Convert file to base64 so we can send it via fetch
  const base64File = await fileToBase64(selectedFile);

  // Construct payload for Apps Script
  const payload = {
    action: "UPLOAD_FILE",
    email: currentUser.email,
    paymentId: paymentId,
    fileName: selectedFile.name,
    fileData: base64File
  };

  try {
    const resp = await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors", // or 'cors' if your GAS is published with appropriate headers
      body: JSON.stringify(payload),
    });
    statusSection.innerText = "Payment and upload success. Analysis in progress...";
    // Now we can poll or wait for the PDF link from the sheet.
    pollForPdfLink(paymentId);
  } catch (err) {
    console.error("Upload error:", err);
    alert("Could not upload file. Check console for details.");
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result.split("base64,")[1];
      resolve(base64Str);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/***************************************
 * 7) Poll for PDF link
 ***************************************/
async function pollForPdfLink(paymentId) {
  // In a real implementation, you might use websockets or a more direct approach.
  // For demonstration, we’ll poll every 5 seconds a few times.
  let attempts = 0;
  const maxAttempts = 12; // 1 minute total
  
  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const checkResp = await fetch(`${webAppUrl}?action=CHECK_PDF&paymentId=${paymentId}`);
      const data = await checkResp.json();
      if (data && data.pdfLink) {
        clearInterval(intervalId);
        statusSection.innerText = "Your report is ready!";
        pdfLink.href = data.pdfLink;
        resultSection.classList.remove("hidden");
      } else {
        statusSection.innerText = `Analysis in progress... (Attempt ${attempts}/${maxAttempts})`;
      }
      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        statusSection.innerText = "Processing took too long. Please check later.";
      }
    } catch (err) {
      console.error("Check PDF error:", err);
    }
  }, 5000);
}

/***************************************
 * 8) Reset Flow
 ***************************************/
function resetFlow() {
  selectedFile = null;
  statusSection.innerText = "";
  payBtn.classList.add("hidden");
  resultSection.classList.add("hidden");
  pdfLink.href = "#";
  document.getElementById("fileInput").value = null;
}
