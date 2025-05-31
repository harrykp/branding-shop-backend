const db = require('../db');
const nodemailer = require('nodemailer');

async function notifyCustomerOfJobStatus(jobId, newStatus) {
  try {
    const result = await db.query(
      `SELECT u.email, u.full_name, j.id AS job_id, j.status, o.id AS order_id
       FROM jobs j
       JOIN orders o ON j.order_id = o.id
       JOIN users u ON o.user_id = u.id
       WHERE j.id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      console.warn("No user found for job status notification");
      return;
    }

    const { email, full_name, job_id, order_id } = result.rows[0];

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Your Job #${job_id} Status Update`,
      html: \`
        <p>Hi \${full_name},</p>
        <p>Your production job (Order #\${order_id}) has been updated to: <strong>\${newStatus}</strong>.</p>
        <p>Thank you,<br/>Branding Shop Team</p>
      \`
    };

    await transporter.sendMail(mailOptions);
    console.log("Job status notification sent to:", email);

  } catch (err) {
    console.error("Failed to notify customer:", err);
  }
}

module.exports = { notifyCustomerOfJobStatus };
