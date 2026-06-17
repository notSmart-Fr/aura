import { PasswordHashingStrategy } from '@vendure/core';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * A custom password hashing strategy that uses bcryptjs instead of native bcrypt.
 * This avoids compiling native C++ bindings, which can fail on Windows environments
 * lacking build tools.
 */
export class BcryptjsPasswordHashingStrategy implements PasswordHashingStrategy {
    hash(plaintext: string): Promise<string> {
        return bcrypt.hash(plaintext, SALT_ROUNDS);
    }
    check(plaintext: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plaintext, hash);
    }
}
