export class EmailAlreadyTakenError extends Error {
  constructor(email: string) {
    super(`Email already taken: ${email}`);
    this.name = 'EmailAlreadyTakenError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsError';
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super('User not found');
    this.name = 'UserNotFoundError';
  }
}

export class TokenInvalidError extends Error {
  constructor() {
    super('Token invalid');
    this.name = 'TokenInvalidError';
  }
}

export class TokenReusedError extends Error {
  constructor() {
    super('Token reused');
    this.name = 'TokenReusedError';
  }
}
