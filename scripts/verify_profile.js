import db from '../src/db.js';
import { updateUserProfile, getUserById } from '../src/services/authService.js';

async function run() {
  console.log('Verifying profile update...');

  // 1. Get a user (or create one)
  let user = db.prepare('SELECT * FROM users LIMIT 1').get();
  if (!user) {
    console.log('No users found. Creating a test user.');
    const info = db.prepare("INSERT INTO users (username, password, role) VALUES ('testuser', 'pass', 'user')").run();
    user = { id: info.lastInsertRowid, username: 'testuser' };
  }
  console.log('Testing with user:', user.id, user.username);

  // 2. Define updates
  const updates = {
    nickname: 'TestNick_' + Date.now(),
    qq: '123456',
    email: 'test@example.com',
    phone: '13800138000',
    download_preference: '海阔视界'
  };

  console.log('Applying updates:', updates);

  // 3. Run update
  try {
    const updatedUser = await updateUserProfile(user.id, updates);
    console.log('Update result:', updatedUser);

    // 4. Verify directly from DB again to be sure
    const verifyUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    console.log('Direct DB fetch:', verifyUser);

    let success = true;
    for (const [key, value] of Object.entries(updates)) {
      if (verifyUser[key] !== value) {
        console.error(`Mismatch for ${key}: expected ${value}, got ${verifyUser[key]}`);
        success = false;
      }
    }

    if (success) {
      console.log('Verification PASSED: Database was updated correctly.');
    } else {
      console.error('Verification FAILED: Database was NOT updated correctly.');
    }

  } catch (err) {
    console.error('Update failed with error:', err);
  }
}

run();
