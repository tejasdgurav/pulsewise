/*******************************************************
 * script.js
 *******************************************************/

// Your deployed Apps Script Web App URL
const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwlLicqKKHN0ihznY4_3VkRMo4U-ceArCyCRgJW7y7hU8o3W8tw9bN8pitUtI2qIexo/exec";

// Track user state
let currentUser = null;
let selectedFile = null;
let fileMimeType = null;

// 1. Listen to file input changes
const fileInput = document.getElementById("file-input");
fileInput.addEventListener("change", handleFileSelect);

// 2. Listen for sign in button
const signInBtn = document.getElementById("sign-in-btn");
signInBtn.addEventListener("click", signInWithGoogle);

// 3. Payment placeholder button
const paymentBtn = document.getElementById("payment-btn");
paymentBtn.addEventListener("click", handlePaymentPlaceholder);

/**
 * 1. Handle file selection
 */
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedFile = file;
    fileMimeType = file.type;
    document.getElementById("status").innerText = `Selected file: ${file.name}`;
    // Prompt user to sign in if not signed in
    if (!currentUser) {
      document.getElementById("status").innerText +=
        "\nPlease sign in with Google to proceed.";
    } else {
      // If user is already signed in, show the payment button (placeholder).
      paymentBtn.style.display = "inline-block";
    }
  }
}

/**
 * 2. Google Sign-In with Firebase
 */
function signInWithGoogle() {
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      // The signed-in user info
      currentUser = result.user;
      document.getElementById("status").innerText = `Signed in as: ${currentUser.email}`;
      // Show payment button (placeholder)
      if (selectedFile) {
        paymentBtn.style.display = "inline-block";
      }
    })
    .catch((error) => {
      console.error("Sign in error", error);
      document.getElementById("status").innerText = "Google Sign-In failed. See console.";
    });
}

/**
 * 3. Payment placeholder function
 *    Replace this with your actual Razorpay integration.
 */
function handlePaymentPlaceholder() {
  // Simulate a successful payment, then call the backend
  document.getElementById("status").innerText = "Simulating payment success...";
  setTimeout(() => {
    // Payment "successful" - now call the Apps Script to process the file
    uploadFileAndProcess();
  }, 1000);
}

/**
 * 4. Upload file to Apps Script and process
 */
function uploadFileAndProcess() {
  if (!selectedFile || !currentUser) {
    document.getElementById("status").innerText = "File or user not available.";
    return;
  }

  // 4.1 Read file as base64
  const reader = new FileReader();
  reader.onload = function(e) {
    const base64Data = btoa(e.target.result);

    // 4.2 Prepare payload
    const payload = {
      fileData: base64Data,
      filename: selectedFile.name,
      mimeType: fileMimeType,
      email: currentUser.email,
      // Payment placeholders
      paymentId: "PAYMENT_ID_PLACEHOLDER",
      paymentStatus: "success"
    };

    // 4.3 Send to Apps Script
    fetch(APPS_SCRIPT_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors", // or "cors" if your script is set appropriately
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      // Because we set mode to no-cors, we might not get a meaningful response.
      // If your web app is deployed to allow cross-origin requests, you can set mode to "cors".
      document.getElementById("status").innerText = 
        "File uploaded. Processing on the server. This may take a moment...";

      // We'll do a polling or second approach: set a timeout to fetch the PDF link if we cannot read the direct response
      // However, ideally, you'd set "cors" and read the JSON response directly here.
      setTimeout(() => {
        document.getElementById("status").innerText = 
          "Check your email or refresh to see if the PDF link is available.";
      }, 5000);
    })
    .catch(error => {
      console.error(error);
      document.getElementById("status").innerText = "Error uploading file: " + error;
    });
  };
  reader.readAsBinaryString(selectedFile);
}
