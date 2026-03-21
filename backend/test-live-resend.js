async function test() {
  const res = await fetch('https://staynest-2qjx.onrender.com/api/send-verification-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vccggfy@gmail.com', token: 'dummy_token', origin: 'http://localhost:5173' })
  });
  
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('BODY:', text);
}

test();
