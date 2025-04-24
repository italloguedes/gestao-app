import nodemailer from 'nodemailer';

export async function sendEmail(to: string, subject: string, content: string) {
  console.log('Starting email send process...');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('Missing email configuration:', {
      hasUser: !!process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD
    });
    throw new Error('Email configuration is missing. Please check EMAIL_USER and EMAIL_PASSWORD in .env');
  }

  try {
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    console.log('Testing connection...');
    await transporter.verify();
    console.log('Connection verified successfully');

    console.log('Sending email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: content,
    });

    console.log('Email sent successfully:', {
      messageId: result.messageId,
      response: result.response
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Detailed email error:', {
      code: error.code,
      command: error.command,
      message: error.message,
      response: error.response,
      stack: error.stack
    });
    
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your email credentials and make sure you are using an App Password for Gmail.');
    } else if (error.code === 'ESOCKET') {
      throw new Error('Network error while sending email. Please check your internet connection.');
    } else {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
} 