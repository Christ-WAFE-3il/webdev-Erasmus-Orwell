import { authenticateUser } from './services/authService.js';
import { initDb } from './db.js';

initDb();

console.log('Testing authenticateUser...');

// Test wrong password
const wrongRes = authenticateUser('student@club.com', 'wrongpassword');
console.log('Wrong password test:', wrongRes);
if (!wrongRes.success && wrongRes.message === 'Wrong email or password') {
  console.log('✅ AC-11 verification passed (wrong password handled correctly)');
} else {
  console.log('❌ AC-11 verification failed');
}

// Test correct password
const correctRes = authenticateUser('student@club.com', 'password123');
console.log('Correct password test:', correctRes);
if (correctRes.success && correctRes.user.name === 'Alice Student') {
  console.log('✅ AC-10 auth service verification passed');
} else {
  console.log('❌ AC-10 auth service verification failed');
}
