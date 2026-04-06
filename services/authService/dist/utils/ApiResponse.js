class ApiResponse {
    statusCode;
    message;
    data;
    status;
    constructor(statusCode, message, data) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.status = statusCode < 400;
    }
}
export default ApiResponse;
//# sourceMappingURL=ApiResponse.js.map