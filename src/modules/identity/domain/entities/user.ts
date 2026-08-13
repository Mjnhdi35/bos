import { type Email } from "../value-objects/email";
import { type PasswordHash } from "../value-objects/password-hash";
import { type UserId } from "../value-objects/user-id";

export type Role = "user" | "admin";

export type UserProps = {
  id: UserId;
  email: Email;
  passwordHash: PasswordHash;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

export class User {
  private readonly props: UserProps;
  private constructor(props: UserProps) {
    this.props = props;
  }

  static rehydrate(props: UserProps): User {
    return new User(props);
  }

  get id(): UserId {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get passwordHash(): PasswordHash {
    return this.props.passwordHash;
  }
  get role(): Role {
    return this.props.role;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
