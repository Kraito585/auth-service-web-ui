import { useState, useEffect } from 'react';
import { TextInput, Button, Alert, Text, Loader, Center, Box, List, Collapse, Group, CopyButton, Paper } from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '../api';

export function TotpSetupForm({ onSuccess }) {
  const [totpUrl, setTotpUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);

  // UI состояния
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showManual, setShowManual] = useState(false);

  // 1. Запрашиваем настройки при загрузке
  useEffect(() => {
    const fetchTotpUrl = async () => {
      try {
        const response = await apiFetch('/api/v1/get/totp', { method: 'GET' });
        
        if (response?.totp_url) {
          setTotpUrl(response.totp_url);
          
          // Вытаскиваем секретный ключ из строки otpauth:// для ручного ввода
          try {
            const urlObj = new URL(response.totp_url);
            const secretParam = urlObj.searchParams.get('secret');
            if (secretParam) setSecret(secretParam);
          } catch (e) {
            console.error("Ошибка парсинга TOTP URL", e);
          }
        }
      } catch (err) {
        setError(err.message || 'Не удалось получить настройки TOTP');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotpUrl();
  }, []);

  // 2. Отправляем код подтверждения
  const handleConfirm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const data = await apiFetch('/api/v1/confirm/totp', {
        body: { code }
      });

      if (data?.codes) {
        setBackupCodes(data.codes);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Неверный код подтверждения');
    } finally {
      setIsSubmitting(false);
    }
  };

  // === ЭКРАН 1: Загрузка ===
  if (isLoading) {
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );
  }

  // === ЭКРАН 3: Успех и показ резервных кодов ===
  if (backupCodes) {
    return (
      <Box>
        <Alert color="green" mb="md">
          Двухфакторная аутентификация успешно подключена!
        </Alert>
        <Text fw={500} mb="sm">Сохраните резервные коды:</Text>
        <Text size="sm" c="dimmed" mb="md">
          Они понадобятся для входа, если вы потеряете доступ к приложению-аутентификатору.
        </Text>

        <Box bg="dark.7" p="md" style={{ borderRadius: 8, marginBottom: 16 }}>
          <List spacing="xs" size="sm" center c="white">
            {backupCodes.map((bc, idx) => (
              <List.Item key={idx}>{bc}</List.Item>
            ))}
          </List>
        </Box>

        <Button fullWidth onClick={() => onSuccess()}>
          Я сохранил коды (Завершить)
        </Button>
      </Box>
    );
  }

  // === ЭКРАН 2: Ввод кода и настройка ===
  return (
    <form onSubmit={handleConfirm}>
      {error && <Alert color="red" mb="md">{error}</Alert>}

      <Text size="sm" c="dimmed" mb="md" ta="center">
        Отсканируйте QR-код в приложении-аутентификаторе (например, Google Authenticator или Authy).
      </Text>

      {/* Отрисовка QR-кода */}
      <Center mb="lg">
        <Box p="sm" bg="white" style={{ borderRadius: 8, border: '1px solid #eee' }}>
          {totpUrl && (
            <QRCodeSVG 
              value={totpUrl} 
              size={200}
              level={"M"}
              includeMargin={false}
            />
          )}
        </Box>
      </Center>

      {/* Блок ручного ввода */}
      {secret && (
        <Box mb="lg">
          <Center mb="sm">
            <Button 
              variant="default"
              size="sm" 
              h="auto" // Позволяем кнопке расти в высоту
              py="xs" // Добавляем вертикальные отступы
              style={{ whiteSpace: 'normal', textAlign: 'center' }} // Разрешаем перенос текста
              onClick={() => setShowManual((v) => !v)}
            >
              {showManual ? 'Скрыть код для ручного ввода' : 'Ввести код вручную (если QR не работает)'}
            </Button>
          </Center>
          
          {showManual && (
            <Paper withBorder p="md" radius="md" mt="sm">
              <Text size="sm" c="dimmed" mb="md" ta="center">
                Введите этот секретный ключ в ваше приложение (например, при добавлении аккаунта вручную):
              </Text>
              
              <Group justify="center" gap="sm" style={{ flexWrap: 'wrap' }}>
                <Text 
                  fw={800} 
                  ff="monospace" 
                  size="lg" // Чуть уменьшил размер с xl на lg, чтобы смотрелось аккуратнее
                  ta="center"
                  style={{ letterSpacing: 2, wordBreak: 'break-all' }} // ВАЖНО: заставляет строку переноситься!
                >
                  {secret}
                </Text>
                
                <CopyButton value={secret} timeout={2000}>
                  {({ copied, copy }) => (
                    <Button color={copied ? 'teal' : 'blue'} variant="light" size="sm" onClick={copy}>
                      {copied ? 'Скопировано' : 'Скопировать'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Paper>
          )}
        </Box>
      )}

      <TextInput
        label="Код подтверждения"
        placeholder="6 цифр из приложения"
        required
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, ''))} // Оставляем только цифры
        mb="md"
      />

      <Button fullWidth type="submit" loading={isSubmitting}>
        Подтвердить и включить
      </Button>
    </form>
  );
}