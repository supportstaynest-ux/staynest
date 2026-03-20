import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  console.log('Sending test email...');
  const { data, error } = await resend.emails.send({
    from: 'StayNest <auth@staynest.in>',
    to: 'rubyarts9956@gmail.com', // testing the email from the user's screenshot
    subject: 'StayNest Testing',
    html: '<p>Testing</p>'
  });

  if (error) {
    console.error('RESEND ERROR:', error.message);
  } else {
    console.log('RESEND SUCCESS:', data);
  }
}

test();
