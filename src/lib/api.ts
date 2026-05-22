
/**
 * API xizmati uchun yordamchi funksiyalar
 */

export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

let csrfPromise: Promise<string | null> | null = null;

/**
 * Ensure the CSRF token cookie is set by making a GET request if needed.
 * Uses a shared promise to avoid duplicate requests when multiple
 * mutations happen simultaneously.
 */
export async function ensureCsrfToken(): Promise<string | null> {
  // Check if we already have the cookie
  let token = getCookie('csrftoken');
  if (token) return token;

  // If we already have a pending request, wait for it
  if (csrfPromise) return csrfPromise;

  // Make a GET request to set the CSRF cookie
  csrfPromise = (async () => {
    try {
      const res = await fetch('/api/auth/csrf/', { 
        method: 'GET',
        credentials: 'include',
      });
      if (res.status === 404) {
        // Fallback: try a GET to the fields endpoint
        await fetch('/api/satellite/fields/', { 
          method: 'GET',
          credentials: 'include',
        });
      }
    } catch {
      // If all fails, try a simple GET to set the cookie
      try {
        await fetch('/api/satellite/fields/', { 
          method: 'GET',
          credentials: 'include',
        });
      } catch {
        // Give up
      }
    }
    token = getCookie('csrftoken');
    return token;
  })();

  const result = await csrfPromise;
  csrfPromise = null; // Reset for next time
  return result;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;

  // For mutating requests, ensure CSRF token is available first
  const method = rest.method || 'GET';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    await ensureCsrfToken();
  }

  // Query parametrlarni qo'shish
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, val.toString());
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const csrftoken = getCookie("csrftoken");
  
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(csrftoken ? { "X-CSRFToken": csrftoken } : {}),
  };

  const response = await fetch(fullUrl, {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    let errorData;
    try {
      const text = await response.text();
      if (text.startsWith("<!DOCTYPE")) {
        throw new Error(`Server xatosi (500). Iltimos, keyinroq urinib ko'ring.`);
      }
      errorData = JSON.parse(text);
    } catch (e: any) {
      const error: any = new Error(e.message || `Xatolik yuz berdi: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    
    // Attach status to the error object if it's an object
    if (typeof errorData === 'object' && errorData !== null) {
      errorData.status = response.status;
    }
    throw errorData;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(url: string, options?: RequestOptions) => 
    request<T>(url, { ...options, method: "GET" }),
    
  post: <T>(url: string, data?: any, options?: RequestOptions) => 
    request<T>(url, { ...options, method: "POST", body: JSON.stringify(data) }),
    
  put: <T>(url: string, data?: any, options?: RequestOptions) => 
    request<T>(url, { ...options, method: "PUT", body: JSON.stringify(data) }),
    
  patch: <T>(url: string, data?: any, options?: RequestOptions) => 
    request<T>(url, { ...options, method: "PATCH", body: JSON.stringify(data) }),
    
  delete: <T>(url: string, options?: RequestOptions) => 
    request<T>(url, { ...options, method: "DELETE" }),
};
