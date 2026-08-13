const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 255;

export class Email {
  public readonly value: string;
  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Email {
    if (typeof value !== 'string') {
      throw new InvalidEmailError(String(value));
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.length === 0 || normalized.length > MAX_EMAIL_LENGTH) {
      throw new InvalidEmailError(value);
    }
    if (!EMAIL_RE.test(normalized)) {
      throw new InvalidEmailError(value);
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}

export class InvalidEmailError extends Error {
  constructor(value: string) {
    super(`Invalid email: ${value}`);
    this.name = 'InvalidEmailError';
  }
}
