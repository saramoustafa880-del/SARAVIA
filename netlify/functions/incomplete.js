const PI_API_URL = "https://api.minepi.com/v2";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { payment } = JSON.parse(event.body || "{}");
    if (!payment || !payment.identifier) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid payment payload" }) };
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) return { statusCode: 200, body: JSON.stringify({ status: "skipped" }) };

    const paymentId = payment.identifier;
    const txid = payment.transaction ? payment.transaction.txid : null;

    if (txid) {
      await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
        method: "POST",
        headers: { "Authorization": `Key ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ txid: txid })
      });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ status: "resolved" })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
