import bcrypt from "bcryptjs";
import { db } from "~/db.server";

export async function getUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

export async function createUser(
  email: string,
  password: string,
  name?: string
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return db.user.create({
    data: { email, passwordHash, name },
  });
}

export async function verifyLogin(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;
  return user;
}

export async function updateUserProfile(
  userId: string,
  data: { name: string | null; email: string }
) {
  return db.user.update({
    where: { id: userId },
    data,
  });
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) return false;
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });
  return true;
}
