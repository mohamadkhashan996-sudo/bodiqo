export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code },
    };
  }
  console.error(error);
  return {
    status: 500,
    body: { error: "Internal server error", code: "INTERNAL" },
  };
}
