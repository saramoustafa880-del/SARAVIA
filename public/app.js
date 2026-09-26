const SCOPES = ["username", "payments", "wallet_address"];
let activePioneer = null;

function showToast(message, type = "info") {
  const toast = document.getElementById("status-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast-${type}`;
  toast.style.display = "block";

  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 5000);
}

function saveReceipt(receipt) {
  try {
    const list = JSON.parse(localStorage.getItem("saravia_receipts") || "[]");
    list.unshift(receipt);
    localStorage.setItem("saravia_receipts", JSON.stringify(list));
    renderReceipts();
  } catch (e) {
    console.warn("Storage warning:", e);
  }
}

function renderReceipts() {
  const container = document.getElementById("receipts-list");
  if (!container) return;
  const receipts = JSON.parse(localStorage.getItem("saravia_receipts") || "[]");

  if (receipts.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:1.5rem;">No transaction receipts yet.</p>';
    return;
  }

  container.innerHTML = receipts.map(r => `
    <div class="receipt-item">
      <div class="receipt-header">
        <span class="receipt-title">${r.memo}</span>
        <span class="receipt-amount">${r.amount} π</span>
      </div>
      <div class="receipt-meta">
        <span>TxID: <code>${r.txid ? r.txid.substring(0, 16) + '...' : 'Verified on Ledger'}</code></span>
        <span>${new Date(r.timestamp).toLocaleDateString()} ${new Date(r.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  `).join("");
}

async function authenticatePioneer() {
  try {
    if (!window.Pi) {
      throw new Error("Pi SDK is not loaded. Please open inside Pi Browser.");
    }
    showToast("Connecting to Pi Mainnet...", "info");
    const authResult = await window.Pi.authenticate(SCOPES, onIncompletePayment);
    activePioneer = authResult.user;

    const sessionInfo = document.getElementById("session-text");
    if (sessionInfo) {
      sessionInfo.innerHTML = `Connected Pioneer: <strong>@${activePioneer.username}</strong> · Pi Mainnet Verified`;
    }

    document.getElementById("btn-login").style.display = "none";
    document.getElementById("btn-support").style.display = "inline-flex";

    showToast(`Authenticated as @${activePioneer.username}`, "success");
  } catch (err) {
    console.error("Auth error:", err);
    showToast(err.message || "Pi authentication failed.", "error");
  }
}

async function payWithPi(amount, memo, metadata = {}) {
  try {
    if (!window.Pi) {
      throw new Error("Please open this app inside Pi Browser.");
    }

    showToast(`Initiating transaction for ${amount} π...`, "info");

    const paymentData = {
      amount: amount,
      memo: memo,
      metadata: metadata
    };

    const callbacks = {
      onReadyForServerApproval: function (paymentId) {
        showToast("Payment awaiting server approval...", "info");
        fetch("/.netlify/functions/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: paymentId })
        }).catch(err => console.warn("Approval notification error:", err));
      },
      onReadyForServerCompletion: function (paymentId, txid) {
        showToast("Broadcasting to Pi Blockchain Ledger...", "info");
        fetch("/.netlify/functions/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: paymentId, txid: txid })
        }).then(() => {
          showToast(`Transaction of ${amount} π completed successfully!`, "success");
          saveReceipt({ paymentId, txid, amount, memo, timestamp: Date.now() });
        }).catch(() => {
          showToast(`Transaction broadcasted: ${txid.substring(0, 10)}...`, "success");
          saveReceipt({ paymentId, txid, amount, memo, timestamp: Date.now() });
        });
      },
      onCancel: function () {
        showToast("Payment cancelled by Pioneer.", "error");
      },
      onError: function (error) {
        console.error("Payment error:", error);
        showToast(error.message || "Payment encountered an error.", "error");
      }
    };

    await window.Pi.createPayment(paymentData, callbacks);
  } catch (err) {
    showToast(err.message || "Payment request failed.", "error");
    throw err;
  }
}

function onIncompletePayment(payment) {
  fetch("/.netlify/functions/incomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment: payment })
  }).catch(e => console.warn(e));
}

window.saraviaPay = payWithPi;
window.saraviaToast = showToast;

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("btn-login");
  const supportBtn = document.getElementById("btn-support");
  const receiptsBtn = document.getElementById("btn-open-receipts");
  const receiptsModal = document.getElementById("receipts-modal");
  const closeReceiptsBtn = document.getElementById("btn-close-receipts");

  if (loginBtn) loginBtn.addEventListener("click", authenticatePioneer);
  if (supportBtn) {
    supportBtn.addEventListener("click", () => {
      payWithPi(0.1, "SARAVIA mainnet support", { type: "support" });
    });
  }

  if (receiptsBtn && receiptsModal) {
    receiptsBtn.addEventListener("click", () => {
      renderReceipts();
      receiptsModal.style.display = "flex";
    });
  }
  if (closeReceiptsBtn && receiptsModal) {
    closeReceiptsBtn.addEventListener("click", () => receiptsModal.style.display = "none");
  }
  window.addEventListener("click", (e) => {
    if (e.target === receiptsModal) receiptsModal.style.display = "none";
  });
});
