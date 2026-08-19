import { HttpError } from "../../shared/errors";

/**
 * Generic API error helpers. The generic API maps runtime exceptions
 * onto HTTP errors with stable `code` strings; consumers (test, postman,
 * SDKs) can branch on `code` rather than message text.
 */

export function badRequest(message: string, code = "invalid_request"): HttpError {
  return new HttpError(400, code, message);
}

export function notFound(message: string, code = "not_found"): HttpError {
  return new HttpError(404, code, message);
}

export function validationFailed(message: string): HttpError {
  return new HttpError(422, "validation_failed", message);
}

export function conflict(message: string, code = "conflict"): HttpError {
  return new HttpError(409, code, message);
}