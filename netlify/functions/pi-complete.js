const { bodyOf, handleError, httpError, json, methodGuard, piFetch, requiredString, assertSupportPayment, unwrapPayment } = require("./_pi");

exports.handler = async (event) => {
  try {
    methodGuard(event);
    const body = bodyOf(event);
    const paymentId = requiredString(body.paymentId, "paymentId", 200);
    const txid = requiredString(body.txid, "txid", 256);
    const payment = await piFetch("/payments/" + encodeURIComponent(paymentId));
    const item = assertSupportPayment(payment);
    if (item.cancelled || item.user_cancelled) throw httpError(409, "This payment was cancelled");
    if (item.developer_completed) return json(200, { success: true, payment: item });
    const completed = await piFetch("/payments/" + encodeURIComponent(paymentId) + "/complete", {
      method: "POST",
      body: JSON.stringify({ txid })
    });
    const result = unwrapPayment(completed);
    if (!result || result.status && result.status.developer_completed === false) {
      throw httpError(502, "Pi did not confirm the completed payment");
    }
    return json(200, { success: true, payment: completed });
  } catch (error) {
    return handleError(error);
  }
};
