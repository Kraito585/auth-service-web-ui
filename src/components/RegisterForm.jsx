import { useState } from 'react';
import { TextInput, PasswordInput, Button, Alert } from '@mantine/core';
import { apiFetch } from '../api';

export function RegisterForm({ onSuccess }) {
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch('/api/v1/register', {
        body: { login, email, password }
      });

      // Бэкенд при регистрации возвращает jwt (где email: false)
      if (data?.jwt) {
        // Передаем токен наверх в AuthFlow, чтобы он запустил воронку
        onSuccess(data.jwt);
      }
    } catch (err) {
      let errorMessage = err.message;
      if (errorMessage.toLowerCase().includes('логин или пароль уже заняты')) {
        errorMessage = 'Логин или почта уже заняты';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert color="red" mb="md">{error}</Alert>}

      <TextInput
        label="Логин"
        placeholder="Ваш логин"
        required
        value={login}
        onChange={(e) => setLogin(e.currentTarget.value)}
        mb="md"
      />

      <TextInput
        label="Email"
        placeholder="your@email.com"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        mb="md"
      />

      <PasswordInput
        label="Пароль"
        placeholder="Надежный пароль"
        required
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        mb="lg"
      />

      <Button fullWidth type="submit" loading={loading}>
        Зарегистрироваться
      </Button>
    </form>
  );
}