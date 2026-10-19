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
    const request = new Request({ endpoint: 'users/log-out', method: 'POST', body: JSON.stringify({ token: this.token }) })
    await request.http()
    this.resetCredentials()
    localStorage.removeItem('session')
  }

  async loadAuth() {
    const session_str = localStorage.getItem('session')
    if (!session_str) return

    const session = JSON.parse(session_str)
    this.set(session)
    const result = await this.checkAuth({ token: session.token, role: session.role })
    this.user = JSON.parse(result.user)
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