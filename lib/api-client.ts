/**
 * API 요청 클라이언트
 * 타임아웃 및 재시도 로직 포함
 */

const DEFAULT_TIMEOUT = 10000; // 10초
const MAX_RETRIES = 2;

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

interface FetchError extends Error {
  status?: number;
  statusText?: string;
}

/**
 * 타임아웃이 있는 fetch 래퍼
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * 재시도 로직이 있는 fetch
 */
async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retries: number = MAX_RETRIES
): Promise<Response> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const { timeout: _, retries: __, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchOptions, timeout);
      
      // 5xx 에러는 재시도
      if (response.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 네트워크 에러는 재시도
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error('Request failed after retries');
}

/**
 * API 클라이언트
 */
export const apiClient = {
  /**
   * GET 요청
   */
  async get(url: string, options: FetchOptions = {}): Promise<Response> {
    return fetchWithRetry(url, {
      ...options,
      method: 'GET',
    }, options.retries);
  },

  /**
   * POST 요청
   */
  async post(url: string, data?: unknown, options: FetchOptions = {}): Promise<Response> {
    return fetchWithRetry(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }, options.retries);
  },

  /**
   * PUT 요청
   */
  async put(url: string, data?: unknown, options: FetchOptions = {}): Promise<Response> {
    return fetchWithRetry(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }, options.retries);
  },

  /**
   * DELETE 요청
   */
  async delete(url: string, options: FetchOptions = {}): Promise<Response> {
    return fetchWithRetry(url, {
      ...options,
      method: 'DELETE',
    }, options.retries);
  },
};

