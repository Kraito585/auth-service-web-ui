export function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    // Заменяем символы Base64Url на стандартный Base64
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    // Декодируем с поддержкой UTF-8
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Ошибка парсинга JWT:", e);
    return null;
  }
}