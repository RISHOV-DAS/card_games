import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      /**
       * Set user and token
       */
      setAuth: (user, token) => {
        set({ user, token, error: null });
        if (token) {
          localStorage.setItem('token', token);
        }
      },

      /**
       * Signup user
       */
      signup: async (email, password, confirmPassword, username) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              confirmPassword,
              username,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Signup failed');
          }

          set({
            user: data.data.user,
            token: data.data.token,
            isLoading: false,
          });

          return { success: true, data: data.data };
        } catch (error) {
          const errorMessage = error.message;
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Login user
       */
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }

          set({
            user: data.data.user,
            token: data.data.token,
            isLoading: false,
          });

          return { success: true, data: data.data };
        } catch (error) {
          const errorMessage = error.message;
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Update user profile
       */
      updateProfile: async (username) => {
        set({ isLoading: true, error: null });
        try {
          const token = get().token;
          const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ username }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Update failed');
          }

          set((state) => ({
            user: { ...state.user, ...data.data },
            isLoading: false,
          }));

          return { success: true, data: data.data };
        } catch (error) {
          const errorMessage = error.message;
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      /**
       * Logout user
       */
      logout: () => {
        set({ user: null, token: null, error: null });
        localStorage.removeItem('token');
      },

      /**
       * Clear error
       */
      clearError: () => set({ error: null }),

      /**
       * Restore session from token
       */
      restoreSession: async (token) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            set({
              user: data.data,
              token,
              isLoading: false,
            });
            return true;
          } else {
            set({ token: null, isLoading: false });
            localStorage.removeItem('token');
            return false;
          }
        } catch (error) {
          set({ token: null, isLoading: false });
          localStorage.removeItem('token');
          return false;
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
