const { bodyOf, getBlobStore, getPiClient, handleError, httpError, json, keyForUid, methodGuard, readJson, verifyAccessToken, writeJson } = require("./_pi");

const CLAIM_AMOUNT = 0.1;
const CLAIM_MEMO = "SARAVIA Testnet welcome bonus";

async function completeExistingClaim(store, claimKey, claim, user) {
  if (!claim || !claim.paymentId) return null;
  const pi = await getPiClient();
  let txid = claim.txid || null;
  if (!txid) {
    const existing = await pi.getPayment(claim.paymentId);
    const payment = existing && existing.payment ? existing.payment : existing;
    txid = payment && payment.transaction && payment.transaction.txid;
  }
  if (!txid) txid = await pi.submitPayment(claim.paymentId);
  await writeJson(store, claimKey, Object.assign({}, claim, { status: "submitted", txid, updatedAt: new Date().toISOString() }));
  const completed = await pi.completePayment(claim.paymentId, txid);
  const payment = completed && completed.payment ? completed.payment : completed;
  if (!payment || payment.status && payment.status.developer_completed === false) throw httpError(502, "Pi has not confirmed the welcome payment");
  await writeJson(store, claimKey, {
    status: "claimed",
    uid: user.uid,
    paymentId: claim.paymentId,
    txid,
    amount: CLAIM_AMOUNT,
    memo: CLAIM_MEMO,
    claimedAt: new Date().toISOString()
  });
  return { paymentId: claim.paymentId, txid };
}

exports.handler = async (event) => {
  try {
    methodGuard(event);
    const { accessToken } = bodyOf(event);
    const user = await verifyAccessToken(accessToken);
    const store = await getBlobStore();
    const claimKey = "claims/" + keyForUid(user.uid) + ".json";
    const current = await readJson(store, claimKey);
    if (current && current.status === "claimed") return json(409, { error: "Already claimed", claimed: true });
    if (current && current.paymentId && (current.status === "processing" || current.status === "submitted" || current.status === "pending")) {
      const recovered = await completeExistingClaim(store, claimKey, current, user);
      if (recovered) return json(200, { success: true, recovered: true, claimed: true, paymentId: recovered.paymentId, txid: recovered.txid });
    }
    await writeJson(store, claimKey, { status: "processing", uid: user.uid, amount: CLAIM_AMOUNT, memo: CLAIM_MEMO, startedAt: new Date().toISOString() });
    const pi = await getPiClient();
    const paymentId = await pi.createPayment({ amount: CLAIM_AMOUNT, memo: CLAIM_MEMO, metadata: { type: "welcome_bonus", once: true }, uid: user.uid });
    await writeJson(store, claimKey, { status: "processing", uid: user.uid, paymentId, amount: CLAIM_AMOUNT, memo: CLAIM_MEMO, createdAt: new Date().toISOString() });
    const txid = await pi.submitPayment(paymentId);
    await writeJson(store, claimKey, { status: "submitted", uid: user.uid, paymentId, txid, amount: CLAIM_AMOUNT, memo: CLAIM_MEMO, updatedAt: new Date().toISOString() });
    const completed = await pi.completePayment(paymentId, txid);
    const payment = completed && completed.payment ? completed.payment : completed;
    if (!payment || payment.status && payment.status.developer_completed === false) throw httpError(502, "Pi has not confirmed the welcome payment");
    await writeJson(store, claimKey, { status: "claimed", uid: user.uid, paymentId, txid, amount: CLAIM_AMOUNT, memo: CLAIM_MEMO, claimedAt: new Date().toISOString() });
    return json(200, { success: true, claimed: true, paymentId, txid });
  } catch (error) {
    return handleError(error);
  }
};
