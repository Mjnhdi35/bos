import { UserNotFoundError } from "../../domain/errors/auth-errors";
import { type UserRepository } from "../../domain/repositories/user-repository";
import { type UserId } from "../../domain/value-objects/user-id";

export type GetCurrentUserDeps = {
  readonly userRepository: UserRepository;
};

export type CurrentUserView = {
  readonly id: string;
  readonly email: string;
  readonly role: "user" | "admin";
  readonly createdAt: string;
};

export async function getCurrentUser(
  userId: UserId,
  deps: GetCurrentUserDeps,
): Promise<CurrentUserView> {
  const user = await deps.userRepository.findById(userId);
  if (!user) {
    throw new UserNotFoundError();
  }
  return {
    id: user.id,
    email: user.email.value,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
