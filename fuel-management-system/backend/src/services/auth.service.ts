/* ── Brute-force login lockout (in-memory, per email + IP) ─────────────── */
interface LoginAttempt {
  count: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, LoginAttempt>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
// Pre-computed hash so unknown emails cost the same bcrypt time as known ones
// (prevents user enumeration via response timing).
const DUMMY_HASH = bcrypt.hashSync('timing-equalization-dummy', 10);

export async function login(
  email: string,
  password: string,
  clientIp = 'unknown'
): Promise<LoginResult> {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const key = `${normalizedEmail}|${clientIp}`;
  const now = Date.now();

  const attempt = loginAttempts.get(key);
  if (attempt && attempt.lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((attempt.lockedUntil - now) / 60000));
    throw new ApiError(
      429,
      `Too many failed login attempts. This account is locked for ${minutes} more ${minutes === 1 ? 'minute' : 'minutes'}.`
    );
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  const referenceHash = user ? user.passwordHash : DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(String(password ?? ''), referenceHash);

  if (!user || !passwordMatches) {
    const current = attempt ?? { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_FAILED_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      current.count = 0;
    }
    loginAttempts.set(key, current);
    throw ApiError.unauthorized('Invalid email or password.');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact the administrator.');
  }

  loginAttempts.delete(key); // successful login clears the counter
  const token = signToken({ sub: user._id.toString(), role: user.role });
  return { token, user: toSafeUser(user) };
}

export async function changePassword(
  user: IUser,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const doc = await User.findById(user._id).select('+passwordHash');
  if (!doc) throw ApiError.notFound('User not found.');

  const currentMatches = await bcrypt.compare(currentPassword, doc.passwordHash);
  if (!currentMatches) throw ApiError.unauthorized('Current password is incorrect.');

  const sameAsOld = await bcrypt.compare(newPassword, doc.passwordHash);
  if (sameAsOld) {
    throw ApiError.badRequest('The new password must be different from the current password.');
  }

  doc.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
  await doc.save();
}