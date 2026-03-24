class ApiError extends Error {
    statusCode: number;
    errors: unknown[];
    constructor(statusCode: number, message: string, errors: unknown[] = [], stack: string = "") {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        Object.setPrototypeOf(this, new.target.prototype);
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export default ApiError;