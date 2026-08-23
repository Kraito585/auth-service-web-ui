import { useState } from 'react';
import { TextInput, Button, Alert, Group, Text } from '@mantine/core';
import { apiFetch } from '../api';

export function EmailConfirmForm({ onSuccess }) {
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [code, setCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // 1. Подтверждение кода
  const handleConfirmCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const data = await apiFetch('/api/v1/confirm/code', {
        body: { code }
      });
      
      // Если бэкенд вернул новый JWT (где email: true), 
      // передаем его наверх в AuthFlow
      if (data?.jwt) {
        onSuccess(data.jwt);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Повторная отправка кода
  const handleResendCode = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      await apiFetch('/api/v1/resend/email', {});
      setMessage('Новый код подтверждения отправлен на вашу почту.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Смена почты
  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await apiFetch('/api/v1/hot/swap/email', {
        body: { email: newEmail }
      });
      
      setMessage('Почта успешно изменена. Запросите код подтверждения заново.');
      setIsEditingEmail(false);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {message && <Alert color="green" mb="md">{message}</Alert>}

      {!isEditingEmail ? (
        /* Форма ввода кода */
        <form onSubmit={handleConfirmCode}>
          <Text size="sm" c="dimmed" mb="md" ta="center">
            Введите код подтверждения, который мы отправили на вашу почту.
          </Text>
          
          <TextInput
            label="Код подтверждения"
            placeholder="123456"
            required
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            mb="md"
          />
          
          <Button fullWidth type="submit" loading={loading} mb="sm">
            Подтвердить
          </Button>
          
          <Group grow mt="md">
            <Button variant="default" onClick={handleResendCode} disabled={loading}>
              Отправить код еще раз
            </Button>
            <Button variant="subtle" onClick={() => setIsEditingEmail(true)} disabled={loading}>
              Изменить почту
            </Button>
          </Group>
        </form>
      ) : (
        /* Форма смены email */
        <form onSubmit={handleChangeEmail}>
          <Text size="sm" c="dimmed" mb="md" ta="center">
            Введите новый адрес электронной почты.
          </Text>
          
          <TextInput
            label="Новый Email"
            placeholder="new@example.com"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
            mb="md"
          />
          
          <Button fullWidth type="submit" loading={loading} mb="sm">
            Сохранить новый Email
          </Button>
          
          <Button fullWidth variant="subtle" onClick={() => setIsEditingEmail(false)} disabled={loading}>
            Отмена (вернуться к вводу кода)
          </Button>
        </form>
      )}
    </>
  );
}