import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const passwordService = {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
};
