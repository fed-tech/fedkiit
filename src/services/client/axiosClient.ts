import axios from "axios";

/**
 * API client — ported from FED-Frontend/src/services/client/axiosClient.js.
 *
 * `baseURL` is now empty: the Express backend lived on a separate origin
 * (VITE_API_URL = http://localhost:5000), but the route handlers are same-origin
 * in Next.js, so every existing `api.get("/api/...")` call resolves correctly
 * with no change at the call sites.
 */
const axiosClient = axios.create({
  baseURL: "",
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = token;
    }
    // ngrok free tier shows an interstitial that can break API calls from XHR.
    config.headers["ngrok-skip-browser-warning"] = "1";
  }
  return config;
});

export default axiosClient;
