import { ErrorResponse, ErrorRequest } from "@/model";
import { sessionStore } from '@/store';
import router from '@/router';

export default class Request {

  constructor({ URL = import.meta.env.VITE_API_URL, endpoint, method = 'GET', params = null, body = null, headers = {}, type = "JSON" }) {
    const session = sessionStore();

    if (type === "JSON") headers["Content-Type"] = "application/json";

    this.URL = URL + endpoint;
    this.method = method;
    this.params = params;
    this.body = body;
    this.headers = headers;

    this.headers["Authorization"] = `Basic ${session.auth.token}`;
  }

  errorHandler = {
    400: event => {
      throw new ErrorResponse(event.body.message);
    },
    401: event => {  
      const session = sessionStore();
      session.auth.resetCredentials();
      localStorage.removeItem('session');
      router.push({ name: 'Log In' });
      
      throw new ErrorResponse(event.body.message);
    },
    403: event => {      
      throw new ErrorResponse(event.body.message);
    }
  }

  /**
   * Metodo para realizar una petición HTTP.
   * @argument {String} URL - URL de la petición.
   * @argument {String} method - Metodo de la petición.
   * @argument {Object} headers - Encabezados de la petición.
   * @argument {Object} body - Cuerpo de la petición.
   * @returns Promesa con la respuesta de la petición
   */
  async http() {
    let url = this.URL;
    if (this.params) {
      url += '?' + new URLSearchParams(this.params).toString();
    }
    return await fetch(url, {
      method: this.method,
      body: this.body,
      headers: this.headers
    }).then(async (res) => {      
      if (res.status >= 200 && res.status < 300) {

        return res.json();
      } else {

        return new ErrorRequest(res.status, await res.json());
      }

    }).then(response => {
      if (response instanceof ErrorRequest) {
        if (this.errorHandler[response.code]) {
          this.errorHandler[response.code](response);
        } else {
          throw new ErrorResponse(response.body?.message || `Error ${response.code}`);
        }
      }

      return response;
    }).catch((err) => {
      throw err;
    });
  }

}
