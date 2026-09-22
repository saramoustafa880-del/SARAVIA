const { bodyOf, handleError, httpError, json, methodGuard, piFetch, requiredString, assertSupportPayment } = require("./_pi");

exports.handler = async (event) => {
  try {
    methodGuard(event);
    const paymentId = requiredString(bodyOf(event).paymentId, "paymentId", 200);
    const payment = await piFetch("/payments/" + encodeURIComponent(paymentId));
    const item = assertSupportPayment(payment);
    if (item.cancelled || item.user_cancelled) throw httpError(409, "This payment was cancelled");
    if (item.developer_completed) return json(200, { success: true, payment: item });
    const approved = await piFetch("/payments/" + encodeURIComponent(paymentId) + "/approve", { method: "POST" });
    return json(200, { success: true, payment: approved });
  } catch (error) {
    return handleError(error);
  }
};
