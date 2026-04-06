import { Elysia } from "elysia";
import { ApiError } from "./errors";

export const errorHandler = new Elysia({ name: "error-handler" })
  .onError(({ error, set }) => {
    // Handle ApiError (our custom errors)
    if (error instanceof ApiError) {
      set.status = error.status;
      return {
        error: error.code,
        message: error.message,
      };
    }

    // Handle Elysia validation errors
    if (error.constructor.name === "ValidationError") {
      set.status = 422;
      return {
        error: "VALIDATION_ERROR",
        message: error.message,
      };
    }

    // Unexpected errors — don't leak internals
    console.error("Unexpected error:", error);
    set.status = 500;
    return {
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    };
  });
