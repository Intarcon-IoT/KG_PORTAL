
class ErrorResponse {

  get errorResponse() {
    return this;
  }

  set({
    message
  }) {
    this.message = message;
  }

  constructor(message) {
    this.message = message;
  }

}

class ErrorRequest {

  get errorRequest() {
    return this;
  }

  set({
    code,
    body
  }) {
    this.code = code;
    this.body = body;
  }

  constructor(code, body) {
    this.code = code;
    this.body = body;
  }


}

export {
  ErrorRequest,
  ErrorResponse
}