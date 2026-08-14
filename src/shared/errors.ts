export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
    this.name = "HttpError";
  }
}
