/**
 * Success Response Formatter
 */
export class SuccessResponse {
  constructor(data, message = "Success", statusCode = 200) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = true;
  }
}

/**
 * Error Response Formatter
 */
export class ErrorResponse extends Error {
  constructor(message = "Error", statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
  }
}

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error("Async handler error:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export default {
  SuccessResponse,
  ErrorResponse,
  asyncHandler,
};
