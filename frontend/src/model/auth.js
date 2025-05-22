import Request from "./request";

class Auth {

  get auth() {
    return this;
  }

  set({
    session,
    email,
    token,
    role,
    user
  }) {
    localStorage.setItem('session', JSON.stringify({ session, email, token, role }));
    this.session = session,
    this.email = email,
    this.token = token,
    this.role = role,
    this.user = user
  }

  constructor() {
    this.session = false,
    this.email = '',
    this.token = '',
    this.role = '',
    this.user = null
  }

  resetCredentials() {
    this.session = false,
    this.email = '',
    this.token = '',
    this.role = '',
    this.user = null
  }

  async login({ email, password }) {
    let response;

    const request = new Request({
      endpoint: 'users/sign-in',
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    await request.http().then(res => {
      response = res;
    }).catch(err => {
      throw err;
    })

    return response;
  }

  async logout() {
    return new Promise((resolve, reject) => {
      try{
        this.resetCredentials();
        localStorage.removeItem('session');
        resolve();
      } catch(err) {
        reject(err);
      }
    })
  }

  async loadAuth() {
    try {
      const session_str = localStorage.getItem('session');

      if (session_str) {
        const session = JSON.parse(session_str);  
        this.set(session);

        const result = await this.checkAuth({ token: session.token, role: session.role }).catch(err => { throw err });
        this.user = JSON.parse(result.user);

      }
      
    } catch(err) {
      throw err;
    }
  }


  async checkAuth({ token, role }) {
    let response;

    const request = new Request({
      endpoint: 'users/load-session',
      method: 'POST',
      body: JSON.stringify({ token, role }) 
    });

    await request.http().then(res => {
      response = res;
    }).catch(err => {
      throw err;
    })

    return response;
  }
}

export {
  Auth
}