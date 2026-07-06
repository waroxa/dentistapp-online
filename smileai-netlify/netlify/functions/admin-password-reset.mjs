import crypto from 'node:crypto';
import {
  auditLog,
  getAdminSetupSecret,
  hashPassword,
  json,
  resolveWorkspaceKey,
  safeParse,
  setAdminCredential,
} from './_lib.mjs';

function validatePassword(password) {
  const value = String(password || '');
  if (value.length < 12) return 'Use at least 12 characters.';
  if (!/[A-Z]/.test(value)) return 'Include at least one uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Include at least one lowercase letter.';
  if (!/[0-9]/.test(value)) return 'Include at least one number.';
  return null;
}

// Self-service recovery for the workspace owner password. Requires the private
// activation code even when a password is already configured — unlike first-time
// activation, an existing install alone is NOT enough to overwrite a password.
export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const body = safeParse(event.body);
    if (!body) return json(400, { error: 'Invalid request body.' });
    const workspaceKey = resolveWorkspaceKey(event, body);

    if (!body.activationSecret) return json(400, { error: 'Activation code is required.' });
    const provided = Buffer.from(String(body.activationSecret), 'utf8');
    const candidates = [`${workspaceKey}:${getAdminSetupSecret()}`];
    if (workspaceKey === 'default') candidates.push(getAdminSetupSecret());
    const isAuthorized = candidates.some((candidate) => {
      const expected = Buffer.from(candidate, 'utf8');
      return expected.length === provided.length && crypto.timingSafeEqual(provided, expected);
    });

    if (!isAuthorized) {
      await auditLog('admin_password_reset_failed', { ip: event.headers['x-forwarded-for'] || 'unknown', workspaceKey });
      return json(401, { error: 'The activation code is invalid.' });
    }

    const password = String(body.newPassword || '');
    const confirmPassword = String(body.confirmPassword || '');
    const validationError = validatePassword(password);
    if (validationError) return json(400, { error: validationError });
    if (password !== confirmPassword) return json(400, { error: 'Passwords do not match.' });

    await setAdminCredential({
      workspaceKey,
      passwordHash: hashPassword(password),
      metadata: { source: 'password_reset', workspaceKey },
    });

    await auditLog('admin_password_reset_completed', { workspaceKey });
    return json(200, { ok: true, message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    console.error('admin_password_reset_failed_unexpected', error);
    return json(503, { error: 'Password reset is temporarily unavailable. Please try again.' });
  }
}
