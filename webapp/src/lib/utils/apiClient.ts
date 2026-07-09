import axios from "axios";
import type { AxiosError } from "axios";

// Callback pour notifier l'app d'une session expirée
type AuthErrorCallback = () => void;
let onAuthError: AuthErrorCallback | null = null;

export const setAuthErrorHandler = (callback: AuthErrorCallback) => {
  onAuthError = callback;
};

const axiosClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour détecter les 401 (session expirée)
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      onAuthError?.();
    }
    return Promise.reject(error);
  },
);

const dataMethods = ["post", "put", "patch", "delete"] as const;

const apiClient = {
  get: async <T>(url: string, params?: any) => {
    try {
      const result = await axiosClient.get<T>(url, { params });
      return {
        data: result.data,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: (error as AxiosError).message || "An error occurred",
      };
    }
  },

  ...dataMethods.reduce(
    (acc, method) => {
      acc[method] = async <T>(url: string, data?: any) => {
        try {
          // FormData : laisser le navigateur poser le Content-Type multipart (avec boundary)
          const config =
            data instanceof FormData
              ? { headers: { "Content-Type": undefined } }
              : undefined;
          const result = await axiosClient[method]<T>(url, data, config);
          return {
            data: result.data,
            error: null,
          };
        } catch (error) {
          return {
            data: null,
            error: (error as AxiosError).message || "An error occurred",
          };
        }
      };
      return acc;
    },
    {} as Record<
      "post" | "put" | "patch" | "delete",
      <T>(
        ...args: any[]
      ) => Promise<{ data: T; error: null } | { data: null; error: string }>
    >,
  ),
};

export default apiClient;
