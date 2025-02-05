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
const webAppUrl = "https://script.google.com/macros/s/AKfycbybWLebhH0Yv51gy_A5J0xCA-6RzGvBuWtclTOA3LhKTn4zBGis-yhIHfmkrvACll59/exec"; 

// DOM elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const payBtn = document.getElementById("payBtn");
const uploadSection = document.getElementById("uploadSection");
const statusSection = document.getElementById("statusSection");
const resultSection = document.getElementById("resultSection");
const pdfLink = document.getElementById("pdfLink");

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
 * 5) Payment (Razorpay Integration)
 *****************************/
async function initiatePayment() {
  if (!selectedFile) {
    alert("No file selected!");
    return;
  }
  if (!currentUser) {
    alert("Please sign in before payment.");
    return;
  }

  try {
    // Fetch order ID from backend
  const orderResponse = await fetch(`${webAppUrl}?action=CREATE_ORDER`, {
  method: "POST",
  mode: "cors",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ amount: 10000 })  // INR 100 in paise
});

    
    const orderData = await orderResponse.json();
    const orderId = orderData.orderId;

    const options = {
      key: orderData.razorpayKey,  // Securely fetched from backend
      amount: 1 * 100,
      currency: "INR",
      name: "AI Blood Report Tool",
      description: "Blood Report Analysis Fee",
      order_id: orderId,
      handler: function (response) {
        console.log("Razorpay Payment ID:", response.razorpay_payment_id);
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
  } catch (err) {
    console.error("Payment initiation error:", err);
    alert("Could not initiate payment. Please try again.");
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Str = reader.result.split("base64,")[1];
      console.log("Base64 Encoded File:", base64Str);  // Log for debugging
      resolve(base64Str);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}


/***************************************
 * 6) Upload File & Confirm Payment
 ***************************************/
async function uploadFileToAppsScript(paymentId) {
  statusSection.innerText = "Uploading file and confirming payment...";

  const base64File = await fileToBase64(selectedFile);

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
    mode: "cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error(`Server error: ${resp.status} ${resp.statusText}`);
  }

  const result = await resp.json();
  if (result.status === "file uploaded") {
    statusSection.innerText = "Payment and upload success. Analysis in progress...";
    pollForPdfLink(paymentId);
  } else {
    throw new Error("Unexpected server response");
  }
} catch (err) {
  console.error("Upload error:", err);
  alert(`Upload failed: ${err.message}`);
}


/***************************************
 * 7) Poll for PDF link
 ***************************************/
async function pollForPdfLink(paymentId) {
  let attempts = 0;
  const maxAttempts = 12;

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const checkResp = await fetch(`${webAppUrl}?action=CHECK_PDF&paymentId=${paymentId}`);
      if (!checkResp.ok) throw new Error("Failed to check PDF");

      const data = await checkResp.json();
      if (data && data.pdfLink) {
        clearInterval(intervalId);
        statusSection.innerText = "Your report is ready!";
        pdfLink.href = data.pdfLink;
        resultSection.classList.remove("hidden");
        return;
      }

      statusSection.innerText = `Analysis in progress... (Attempt ${attempts}/${maxAttempts})`;
    } catch (err) {
      console.error("Check PDF error:", err);
      statusSection.innerText = "An error occurred while checking the report.";
    }

    if (attempts >= maxAttempts) {
      clearInterval(intervalId);
      statusSection.innerText = "Processing took too long. Please check later.";
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
