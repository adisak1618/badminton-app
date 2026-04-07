export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const notFound = (resource: string) =>
  new ApiError(404, "NOT_FOUND", `${resource} not found`);

export const forbidden = (msg = "Forbidden") =>
  new ApiError(403, "FORBIDDEN", msg);

export const unauthorized = (msg = "Unauthorized") =>
  new ApiError(401, "UNAUTHORIZED", msg);

export const unprocessableEntity = (msg: string) =>
  new ApiError(422, "UNPROCESSABLE_ENTITY", msg);
