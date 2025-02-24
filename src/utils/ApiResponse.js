class ApiResponse {
    constructor (){
        this.statusCode = this.statusCode;
        this.data = this.data;
        this.message = this.message;
        this.success = this.statusCode < 400;
    }
}

export {ApiResponse}