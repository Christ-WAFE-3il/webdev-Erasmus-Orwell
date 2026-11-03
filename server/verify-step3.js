import { spawn } from 'child_process';

const serverProcess = spawn('node', ['server/index.js'], { stdio: 'inherit' });

setTimeout(async () => {
  try {
    console.log('\n--- Running Step 3 Verification ---');

    // 1. Check unauthenticated access to /api/events (AC-9)
    const res1 = await fetch('http://localhost:3000/api/events');
    const text1 = await res1.text();
    console.log('Unauthenticated /api/events status:', res1.status, text1);
    if (res1.status === 401) {
      console.log('✅ AC-9 verification passed (401 Unauthorized)');
    } else {
      console.log('❌ AC-9 verification failed');
    }

    // 2. Check wrong password sign-in (AC-11)
    const res2 = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@club.com', password: 'wrong' })
    });
    const data2 = await res2.json();
    console.log('Wrong password response:', res2.status, data2);
    if (res2.status === 401 && data2.error === 'Wrong email or password') {
      console.log('✅ AC-11 verification passed');
    } else {
      console.log('❌ AC-11 verification failed');
    }

    // 3. Check correct sign-in (AC-10)
    const res3 = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@club.com', password: 'password123' })
    });
    const cookie = res3.headers.get('set-cookie');
    const data3 = await res3.json();
    console.log('Correct password response:', res3.status, data3);
    if (res3.status === 200 && data3.user.name === 'Alice Student') {
      console.log('✅ AC-10 verification passed');
    } else {
      console.log('❌ AC-10 verification failed');
    }

    // 4. Access events with session cookie
    const res4 = await fetch('http://localhost:3000/api/events', {
      headers: { cookie: cookie }
    });
    const data4 = await res4.json();
    console.log('Authenticated /api/events response:', res4.status, data4.events?.length);
    if (res4.status === 200 && data4.events.length > 0) {
      console.log('✅ Authenticated events list passed');
    } else {
      console.log('❌ Authenticated events list failed');
    }

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    serverProcess.kill();
    process.exit(0);
  }
}, 2000);
