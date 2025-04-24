import nodemailer from 'nodemailer';

interface EmailData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailData) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}