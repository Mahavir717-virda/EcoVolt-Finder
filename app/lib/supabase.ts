/**
 * Supabase compatibility shim redirecting to local state and EcoVolt REST backend
 */

export const supabase = {
  auth: {
    getSession: async () => ({
      data: {
        session: {
          user: {
            id: 'usr_driver_101',
            email: 'deep@ecovolt.io',
          },
        },
      },
    }),
    getUser: async () => ({
      data: {
        user: {
          id: 'usr_driver_101',
          email: 'deep@ecovolt.io',
        },
      },
      error: null,
    }),
    signInWithPassword: async () => ({ error: null }),
    signUp: async () => ({ data: { user: { id: 'usr_driver_101' } }, error: null }),
    signOut: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    onAuthStateChange: (callback: any) => {
      // Notify authenticated state
      setTimeout(() => {
        callback('SIGNED_IN', {
          user: { id: 'usr_driver_101', email: 'deep@ecovolt.io' },
        });
      }, 100);
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  },
  channel: () => ({
    on: () => ({
      subscribe: () => ({
        unsubscribe: () => {},
      }),
    }),
  }),
};
