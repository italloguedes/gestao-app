import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export async function sendEmail(to: string, subject: string, content: string) {
  const mailOptions: any = {
    from: `Sala Sensorial / ALECE <${process.env.GMAIL_USER}>`,
    to,
    subject,
  };

  // Se o conteúdo for HTML, usa a propriedade 'html', senão usa 'text'
  if (content.includes('<div')) {
    mailOptions.html = content;
  } else {
    mailOptions.text = content;
  }

  await transporter.sendMail(mailOptions);
}