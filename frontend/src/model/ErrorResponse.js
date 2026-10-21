
class ErrorResponse {

  get errorResponse() {
    return this;
  }

  set({
    message
  }) {
    this.message = message;
  }

  // code: estado HTTP; sin él, el fallo es de red
  constructor(message, code) {
    this.message = message;
    this.code = code;
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