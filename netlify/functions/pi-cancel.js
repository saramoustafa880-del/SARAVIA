const { bodyOf, handleError, httpError, json, methodGuard, piFetch, requiredString, assertSupportPayment } = require("./_pi");

exports.handler = async (event) => {
  try {
    methodGuard(event);
    const paymentId = requiredString(bodyOf(event).paymentId, "paymentId", 200);
    const payment = await piFetch("/payments/" + encodeURIComponent(paymentId));
    const item = assertSupportPayment(payment);
    if (item.developer_completed) throw httpError(409, "A completed payment cannot be cancelled");
    const cancelled = await piFetch("/payments/" + encodeURIComponent(paymentId) + "/cancel", { method: "POST" });
    return json(200, { success: true, payment: cancelled });
  } catch (error) {
    return handleError(error);
  }
};
