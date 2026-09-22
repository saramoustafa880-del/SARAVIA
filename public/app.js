const SCOPES = ["username", "payments", "wallet_address"];
const PAYMENT = { amount: 0.1, memo: "SARAVIA Testnet support", metadata: { type: "support" } };
let accessToken = null;
let currentUser = null;
let incompletePayment = null;

const $ = (id) => document.getElementById(id);
const els = { login: $("login"), logout: $("logout"), name: $("pioneer-name"), browser: $("browser-note"), getPi: $("get-pi"), support: $("support"), supporter: $("supporter"), user: $("d-user"), wallet: $("d-wallet"), claim: $("d-claim"), supportState: $("d-support"), status: $("status"), cancel: $("cancel-incomplete") };

function setStatus(message, kind) {
  els.status.textContent = message || "";
  els.status.dataset.kind = kind || "";
}
function setBusy(button, busy, label) {
  button.disabled = busy;
  if (label) button.dataset.originalLabel = button.textContent;
  if (busy) button.textContent = label || "Working…";
  else if (button.dataset.originalLabel) button.textContent = button.dataset.originalLabel;
}
function shortWallet(value) { return value ? value.slice(0, 8) + "…" + value.slice(-6) : "—"; }
async function post(path, body) {
  const response = await fetch("/.netlify/functions/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || "The Testnet request failed"); error.status = response.status; throw error; }
  return data;
}
function renderUser(data) {
  currentUser = data;
  els.name.textContent = data.username || "Pioneer";
  els.user.textContent = data.username || "Pioneer";
  els.wallet.textContent = shortWallet(data.wallet_address);
  els.claim.textContent = data.claimed ? "Already claimed" : data.claimStatus === "pending" ? "Recovery available" : "Not claimed";
  els.getPi.disabled = false;
  els.getPi.textContent = data.claimed ? "Already claimed" : "Get Pi ↗";
  if (data.claimed) els.getPi.disabled = true;
  els.support.disabled = false;
  els.login.hidden = true;
  els.logout.hidden = false;
}
function showBrowserHint() { if (!window.Pi) els.browser.hidden = false; }
async function onIncompletePaymentFound(payment) {
  incompletePayment = payment;
  els.cancel.hidden = false;
  const paymentId = payment && payment.identifier;
  const txid = payment && payment.transaction && payment.transaction.txid;
  if (!paymentId) { setStatus("Pi returned an incomplete payment without an identifier.", "error"); return; }
  if (txid) {
    setStatus("Recovering the unfinished support payment…");
    try {
      await post("pi-complete", { paymentId, txid });
      els.cancel.hidden = true;
      els.supporter.hidden = false;
      els.supportState.textContent = "Confirmed";
      setStatus("Your unfinished support payment is now complete.", "success");
    } catch (error) { setStatus(error.message, "error"); }
  } else {
    setStatus("Pi found an unfinished payment. Complete it in Pi Wallet or cancel it here.");
  }
}
async function login() {
  if (!window.Pi) { showBrowserHint(); setStatus("Open this app in Pi Browser to sign in.", "error"); return; }
  setBusy(els.login, true, "Connecting…");
  try {
    const auth = await window.Pi.authenticate(SCOPES, onIncompletePaymentFound);
    accessToken = auth.accessToken;
    const session = await post("pi-me", { accessToken });
    renderUser(session);
    setStatus("Signed in as @" + session.username + ".", "success");
  } catch (error) { setStatus(error.message || "Pi sign-in failed.", "error"); }
  finally { if (!currentUser) setBusy(els.login, false); }
}
async function claimGetPi() {
  if (!accessToken || !currentUser) { setStatus("Sign in with Pi before claiming Test-Pi.", "error"); return; }
  setBusy(els.getPi, true, "Sending…");
  try {
    const result = await post("pi-get-pi", { accessToken });
    currentUser.claimed = true;
    els.claim.textContent = "Already claimed";
    els.getPi.textContent = "Already claimed";
    setStatus(result.recovered ? "Your pending welcome payment was recovered." : "0.1 Test-Pi sent to your wallet.", "success");
  } catch (error) {
    if (error.status === 409) { currentUser.claimed = true; els.claim.textContent = "Already claimed"; els.getPi.textContent = "Already claimed"; }
    setStatus(error.message, error.status === 409 ? "success" : "error");
  } finally { els.getPi.disabled = Boolean(currentUser && currentUser.claimed); }
}
async function support() {
  if (!window.Pi || !accessToken) { setStatus("Sign in with Pi before sending support.", "error"); return; }
  setBusy(els.support, true, "Opening Pi Wallet…");
  try {
    await window.Pi.createPayment(PAYMENT, {
      onReadyForServerApproval: async (paymentId) => { await post("pi-approve", { paymentId }); },
      onReadyForServerCompletion: async (paymentId, txid) => { await post("pi-complete", { paymentId, txid }); els.supporter.hidden = false; els.supportState.textContent = "Confirmed"; setStatus("Support payment completed on Pi Testnet.", "success"); },
      onCancel: async (paymentId) => { try { await post("pi-cancel", { paymentId }); } catch (error) { console.warn("Pi cancel acknowledgement failed", error); } setStatus("Payment cancelled. Support remains locked."); },
      onError: (error) => { setStatus(error && error.message ? error.message : "Pi payment failed.", "error"); }
    });
  } catch (error) { setStatus(error.message || "Support payment failed.", "error"); }
  finally { setBusy(els.support, false); }
}
async function cancelIncomplete() {
  if (!incompletePayment || !incompletePayment.identifier) return;
  setBusy(els.cancel, true, "Cancelling…");
  try { await post("pi-cancel", { paymentId: incompletePayment.identifier }); incompletePayment = null; els.cancel.hidden = true; setStatus("Unfinished payment cancelled. Support remains locked."); }
  catch (error) { setStatus(error.message, "error"); }
  finally { setBusy(els.cancel, false); }
}
function logout() {
  accessToken = null; currentUser = null; incompletePayment = null;
  els.name.textContent = "Not signed in"; els.user.textContent = "—"; els.wallet.textContent = "—"; els.claim.textContent = "Not claimed"; els.supportState.textContent = "Locked";
  els.getPi.disabled = true; els.getPi.textContent = "Get Pi ↗"; els.support.disabled = true; els.supporter.hidden = true; els.cancel.hidden = true; els.login.hidden = false; els.logout.hidden = true;
  setStatus("Signed out of SARAVIA. Pi permissions remain managed by Pi Network.");
}
els.login.addEventListener("click", login);
els.logout.addEventListener("click", logout);
els.getPi.addEventListener("click", claimGetPi);
els.support.addEventListener("click", support);
els.cancel.addEventListener("click", cancelIncomplete);
showBrowserHint();
