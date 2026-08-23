import { useState } from 'react';
import { TextInput, PasswordInput, Button, Alert, Group, Text, Box } from '@mantine/core';
import { apiFetch } from '../api';

export function LoginForm({ onSuccess }) {
  // Состояние шагов (1 - ввод логина, 2 - ввод пароля/кода)
  const [step, setStep] = useState(1);
  
  // Данные пользователя
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [mfaInputCode, setMfaInputCode] = useState(''); // Для email-кода или TOTP-кода
  
  // Данные от бэкенда с первого шага
  const [authType, setAuthType] = useState(null);
  const [mfaToken, setMfaToken] = useState(null); // Тот самый "code", который станет Bearer-токеном
  
  // UI состояния
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // === ШАГ 1: Отправка логина ===
  const handleStep1 = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch('/api/v1/login', {
        body: { login }
      });

      if (data?.authType && data?.code) {
        setAuthType(data.authType);
        setMfaToken(data.code);
        setStep(2);
      } else {
        throw new Error('Некорректный ответ от сервера');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // === ШАГ 2: Подтверждение (пароль / mfa) ===
  const handleStep2 = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let endpoint = '';
    let body = {};

    // Формируем запрос на основе authType
    switch (authType) {
      case 'password':
        endpoint = '/api/v1/auth/login/password';
        body = { password };
        break;
      case 'password_email':
        endpoint = '/api/v1/auth/login/password-email';
        body = { password, code: mfaInputCode };
        break;
      case 'password_totp':
        endpoint = '/api/v1/auth/login/password-totp';
        body = { password, code: mfaInputCode };
        break;
      case 'totp':
        endpoint = '/api/v1/auth/login/totp';
        body = { code: mfaInputCode };
        break;
      default:
        setError('Неизвестный тип авторизации');
        setLoading(false);
        return;
    }

    try {
      const data = await apiFetch(endpoint, {
        body,
        token: mfaToken // Передаем промежуточный токен, apiFetch подставит его в Bearer
      });

      if (data?.jwt) {
        onSuccess(data.jwt);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // === РЕНДЕР ===
  return (
    <Box>
      {error && <Alert color="red" mb="md">{error}</Alert>}

      {step === 1 ? (
        <form onSubmit={handleStep1}>
          <TextInput
            label="Логин"
            placeholder="Ваш логин"
            required
            value={login}
            onChange={(e) => setLogin(e.currentTarget.value)}
            mb="md"
          />
          <Button fullWidth type="submit" loading={loading}>
            Далее
          </Button>
        </form>
      ) : (
        <form onSubmit={handleStep2}>
          <Text size="sm" mb="md">
            Вход для: <b>{login}</b>
          </Text>

          {/* Показываем поле пароля, если оно требуется */}
          {['password', 'password_email', 'password_totp'].includes(authType) && (
            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              required
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              mb="md"
            />
          )}

          {/* Показываем поле кода, если оно требуется */}
          {['password_email', 'password_totp', 'totp'].includes(authType) && (
            <TextInput
              label={authType.includes('email') ? 'Код из письма' : 'TOTP код из приложения'}
              placeholder="123456"
              required
              value={mfaInputCode}
              onChange={(e) => setMfaInputCode(e.currentTarget.value)}
              mb="md"
            />
          )}

          <Group grow mt="xl">
            <Button variant="default" onClick={() => setStep(1)} disabled={loading}>
              Назад
            </Button>
            <Button type="submit" loading={loading}>
              Войти
            </Button>
          </Group>
        </form>
      )}
    </Box>
  );
}