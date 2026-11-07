import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError } from './errors.js';

const BCRYPT_COST = 12;
const DUPLICATE_KEY_ERROR = 11000;
const EMAIL_TAKEN_MESSAGE = 'An account with this email already exists.';
// Compared against when the email is unknown, so both failure paths take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

function emailTakenError() {
  return new AppError(409, 'EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE, { email: EMAIL_TAKEN_MESSAGE });
}

function toPublicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email };
}

export async function registerUser({ name, email, password }) {
  if (await User.exists({ email })) throw emailTakenError();

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    const user = await User.create({ name, email, passwordHash });
    return toPublicUser(user);
  } catch (err) {
    if (err.code === DUPLICATE_KEY_ERROR) throw emailTakenError();
    throw err;
  }
}

export async function authenticateUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const isMatch = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !isMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  return toPublicUser(user);
}

export async function findUserById(userId) {
  if (!mongoose.isValidObjectId(userId)) return null;
  const user = await User.findById(userId);
  return user ? toPublicUser(user) : null;
}
