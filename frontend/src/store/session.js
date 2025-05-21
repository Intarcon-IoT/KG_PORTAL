import { defineStore } from 'pinia';
import { Auth } from '@/model';

export const sessionStore = defineStore('session', {
  state: () => ({
    auth: new Auth()
  }),
  getters: {
    getAuth: (state) => state.auth
  },
  actions: {
    setSession(auth) {
      this.auth.set(auth);
    }
  }
});