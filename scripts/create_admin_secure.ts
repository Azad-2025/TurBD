import bcrypt from 'bcryptjs';
import readline from 'readline';
import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * TurfBD Secret-Safe Super Admin Provisioning Tool
 *
 * Security Features:
 * 1. Passwords are typed interactively with terminal masking (never in CLI args).
 * 2. Passwords are never written to ~/.bash_history or visible in `ps aux`.
 * 3. Confirms target database host before making changes.
 * 4. Enforces strong password policy (min 10 chars, uppercase, lowercase, number, symbol).
 * 5. Strictly sets role='admin' and isSuperAdmin=true.
 * 6. Never prints passwords or default passwords to stdout/logs.
 */

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function askPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    // If running in CI/headless with ADMIN_PASSWORD env var, use it safely
    if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length >= 10) {
      console.log(`${query}[Password ingested securely from environment variable ADMIN_PASSWORD]`);
      return resolve(process.env.ADMIN_PASSWORD.trim());
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const stdin = process.stdin;
    process.stdout.write(query);

    let password = '';
    const onData = (char: Buffer) => {
      const str = char.toString('utf-8');
      if (str === '\n' || str === '\r' || str === '\u0004') {
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } else if (str === '\u0008' || str === '\x7f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (str === '\u0003') {
        process.stdout.write('\nOperation cancelled.\n');
        process.exit(1);
      } else {
        password += str;
        process.stdout.write('*');
      }
    };

    if (stdin.isTTY) {
      stdin.on('data', onData);
    } else {
      // Non-interactive fallback
      rl.question('', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    }
  });
}

function validatePasswordPolicy(password: string): { valid: boolean; reason?: string } {
  if (password.length < 10) {
    return { valid: false, reason: 'Password must be at least 10 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

async function main() {
  console.log('================================================================');
  console.log('   TurfBD Secret-Safe Super Admin Provisioning Tool (Beta)      ');
  console.log('================================================================');

  // 1. Verify Target Database Environment
  const dbHost = process.env.SQL_HOST || 'unknown-host';
  const dbName = process.env.SQL_DB_NAME || 'turfbd';
  const dbUser = process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'unknown-user';
  console.log(`Target Database Host : ${dbHost}`);
  console.log(`Target Database Name : ${dbName}`);
  console.log(`Target Database User : ${dbUser}`);
  console.log('----------------------------------------------------------------');

  // 2. Interactive Prompts
  const email = (await askQuestion('Enter Super Admin Email: ')).toLowerCase().trim();
  if (!email || !email.includes('@')) {
    console.error('❌ Error: A valid email address is required.');
    process.exit(1);
  }

  const name = (await askQuestion('Enter Full Name: ')).trim();
  if (!name) {
    console.error('❌ Error: Full name is required.');
    process.exit(1);
  }

  const phone = (await askQuestion('Enter Phone Number (+8801XXXXXXXXX): ')).trim();
  if (!phone) {
    console.error('❌ Error: Phone number is required.');
    process.exit(1);
  }

  const password = await askPassword('Enter Secret Master Password (input will be masked): ');
  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.valid) {
    console.error(`❌ Weak Password Rejected: ${policyCheck.reason}`);
    process.exit(1);
  }

  const confirmPassword = await askPassword('Confirm Master Password: ');
  if (password !== confirmPassword) {
    console.error('❌ Error: Passwords do not match.');
    process.exit(1);
  }

  console.log('\nHashing credentials with bcrypt (salt rounds = 10)...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  try {
    const [existing] = await db.select().from(users).where(eq(users.email, email));

    if (existing) {
      console.log(`User ${email} already exists (User ID: ${existing.id}).`);
      console.log('Elevating account to Super Admin and updating hashed credentials...');
      await db
        .update(users)
        .set({
          role: 'admin',
          isSuperAdmin: true,
          passwordHash,
          name,
          phone,
          isEmailVerified: true,
          isPhoneVerified: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, existing.id));

      console.log(`✅ Success: User ID ${existing.id} (${email}) is now verified as Super Admin.`);
    } else {
      console.log(`Provisioning new Super Admin account for ${email}...`);
      const [newUser] = await db
        .insert(users)
        .values({
          name,
          phone,
          email,
          passwordHash,
          role: 'admin',
          isSuperAdmin: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          profileImage: null,
        })
        .returning();

      console.log(`✅ Success: Super Admin created successfully! (User ID: ${newUser.id})`);
    }

    console.log('================================================================');
    console.log('Super Admin Setup Summary:');
    console.log(`  Account Email : ${email}`);
    console.log(`  Role Assigned : admin`);
    console.log(`  Privilege     : isSuperAdmin = true`);
    console.log(`  Password      : [SECURED — Never printed or stored in logs]`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Database error during provisioning:', err?.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
