import { getAccessToken, setAccessToken, clearAccessToken } from './authStore';
import { parseJwt } from './utils';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function apiFetch(endpoint, options = {}) {
  const { body, method = 'POST' } = options;
  
  // Берем токен из опций (например, для MFA) или из in-memory хранилища
  let token = options.token || getAccessToken();

  const executeRequest = async (currentToken) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(`/auth${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json();

    if (response.status === 401 || result.error?.code === 401) {
      throw { status: 401, message: 'Unauthorized' };
    }

    if (!response.ok || !result.success) {
      throw new Error(result.error?.message || 'Произошла ошибка при запросе');
    }

    return result.data;
  };

  try {
    return await executeRequest(token);
  } catch (error) {
    if (error.status !== 401 || endpoint === '/api/v1/refresh') {
      throw error;
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        return executeRequest(newToken);
      }).catch((err) => {
        throw err;
      });
    }

    isRefreshing = true;

    try {
      const refreshResponse = await fetch('/auth/api/v1/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Отправляем Refresh куку
      });

      const refreshResult = await refreshResponse.json();

      if (!refreshResponse.ok || !refreshResult.success) {
        throw new Error('Refresh failed');
      }

      const newToken = refreshResult.data.access_token;
      
      // Сохраняем новый токен только в память!
      setAccessToken(newToken);

      processQueue(null, newToken);

      return await executeRequest(newToken);

    } catch (refreshError) {
      // Очищаем память
      clearAccessToken();
      processQueue(refreshError, null);
      
      window.location.href = '/auth';
      
      throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
    } finally {
      isRefreshing = false;
    }
  }
}

let refreshTimeout = null;

// Обязательно ключевое слово export
export const startSilentRefresh = (token) => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }

  if (!token) return;

  const payload = parseJwt(token);
  if (!payload || !payload.exp) return;

  // exp хранится в секундах, переводим в миллисекунды
  const expiresAt = payload.exp * 1000; 
  const timeUntilExpiry = expiresAt - Date.now();

  // Обновляем за 1 минуту до истечения
  const refreshDelay = timeUntilExpiry - 60000;

  if (refreshDelay > 0) {
    refreshTimeout = setTimeout(async () => {
      try {
        const response = await fetch('/api/v1/refresh', {
          method: 'POST',
          credentials: 'include'
        });
        
        const result = await response.json();
        
        // В зависимости от ответа твоего бэкенда извлекаем токен
        const newToken = result.access_token || result.data?.access_token;
        
        if (newToken) {
          setAccessToken(newToken);
          startSilentRefresh(newToken);
        }
      } catch (error) {
        console.error('Фоновое обновление токена не удалось:', error);
      }
    }, refreshDelay);
  }
};