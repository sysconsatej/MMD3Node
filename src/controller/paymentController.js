import axios from "axios";
import PaytmChecksum from "paytmchecksum";
const MERCHANT_ID = "AiPaRa73056566301905"; // Your Paytm MID
const MERCHANT_KEY = "@Xt98A0WnPSvXzE6"; // Your Paytm Secret Key

const SUCCESS_REDIRECT_URL = "http://wzccpayment.mastergroups.com/response";

export const sendMail = async ({
  amount,
  username,
  txnId,
  status,
  orderId,
}) => {
  const now = new Date().toLocaleString();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "akibgain@gmail.com",
      pass: "khgp awqp zklj shoi", // Gmail App Password
    },
  });

  const htmlBody = `
    <p>Dear Shrikant,</p>
    <p>Payment of Rs <strong>${amount}</strong> has been received.</p>
    <table border="1" cellpadding="5" cellspacing="0" style="width:400px">
      <tr><td><b>Paid By</b></td><td>${username}</td></tr>
      <tr><td><b>Transaction ID</b></td><td>${txnId}</td></tr>
      <tr><td><b>Order ID</b></td><td>${orderId}</td></tr>
      <tr><td><b>Status</b></td><td>${status}</td></tr>
      <tr><td><b>Date</b></td><td>${now}</td></tr>
    </table>
    <p>Regards,<br/>Support Team</p>
  `;

  await transporter.sendMail({
    from: "akibgain@gmail.com",
    to: "shrikant.dharpawar@mastergroups.com, akibgain@gmail.com",
    subject: `Payment done by ${username} of Amount Rs.${amount}`,
    html: htmlBody,
  });

  console.log("📧 Email sent successfully");
};

export const paymentController = async (req, res) => {
  const { Amount, UserName } = req.query;

  if (!Amount || !UserName) {
    return res.status(400).send("Amount and UserName are required.");
  }

  const body = {
    mid: MERCHANT_ID,
    linkType: "FIXED",
    linkDescription: "TestPayment",
    linkName: "TestNodePayment",
    redirectionUrlSuccess: SUCCESS_REDIRECT_URL,
    amount: Amount,
  };

  const checksum = await PaytmChecksum.generateSignature(
    JSON.stringify(body),
    MERCHANT_KEY
  );

  const requestBody = {
    body: body,
    head: {
      tokenType: "AES",
      signature: checksum,
    },
  };

  try {
    const { data } = await axios.post(
      "https://securegw.paytm.in/link/create", // use staging for testing
      requestBody,
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Paytm Create Link Response:", data);

    if (data.body.resultInfo.resultStatus === "S") {
      // Redirect user to short URL
      return res.redirect(data.body.shortUrl);
    } else {
      res.status(400).send(data.body.resultInfo.resultMessage);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating payment link.");
  }
};

export const fetchTransaction = async (req, res) => {
  const { linkId, UserName, Amount } = req.query; // optionally from query/session

  if (!linkId) {
    return res.status(400).send("Missing linkId.");
  }

  const body = {
    mid: MERCHANT_ID,
    linkId: linkId,
  };

  const checksum = await PaytmChecksum.generateSignature(
    JSON.stringify(body),
    MERCHANT_KEY
  );

  const requestBody = {
    body: body,
    head: {
      tokenType: "AES",
      signature: checksum,
    },
  };

  try {
    const { data } = await axios.post(
      "https://securegw.paytm.in/link/fetchTransaction",
      requestBody,
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("Paytm Fetch Response:", data);

    const order = data.body.orders[0];
    const status = order.orderStatus;
    const txnId = order.txnId;

    // Send email
    await sendMail({
      amount: Amount,
      username: UserName,
      txnId,
      status,
      orderId: order.orderId,
    });

    res.send({
      message: "Payment status fetched successfully",
      status,
      txnId,
      orderId: order.orderId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching transaction status.");
  }
};
