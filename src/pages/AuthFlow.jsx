import { useEffect, useState } from 'react';
import { Center, Loader, Container, Paper, Tabs, Title, Text, Button, Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { apiFetch, startSilentRefresh } from '../api';
import { setAccessToken } from '../authStore';
import { parseJwt } from '../utils';

import { LoginForm } from '../components/LoginForm';
import { RegisterForm } from '../components/RegisterForm';
import { EmailConfirmForm } from '../components/EmailConfirmForm'; 
import { TotpSetupForm } from '../components/TotpSetupForm';

export function AuthFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState('checking'); 
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    console.log("[Шаг 1] Начинаем проверку сессии...");
    try {
      const data = await apiFetch('/api/v1/refresh', { method: 'POST' });
      console.log("[Шаг 2] Успешный ответ от refresh:", data);

      if (data && data.access_token) {
        console.log("[Шаг 3] Токен найден! Обновляем память и запускаем таймер...");
        setAccessToken(data.access_token);
        startSilentRefresh(data.access_token);
        evaluateFunnelStep(data.access_token);
      } else {
        console.warn("[Ошибка] В data нет access_token! Сбрасываем на login.");
        setStep('login');
      }
    } catch (err) {
      // ВОТ ЗДЕСЬ мы наконец-то увидим, если скрипт упал:
      console.error("[ОШИБКА ПРИ ПРОВЕРКЕ СЕССИИ]:", err);
      setStep('login');
    }
  };

  const evaluateFunnelStep = (token) => {
    console.log("[Шаг 4] Оценка состояния воронки...");
    try {
      const payload = parseJwt(token);
      console.log("[Шаг 5] Payload токена:", payload);

      if (payload && payload.email === false) {
        console.log("[Шаг 6] Почта не подтверждена -> идем на email_confirm");
        setStep('email_confirm');
      } else {
        console.log("[Шаг 6] Почта подтверждена -> проверяем Consent/Dashboard");
        checkConsentOrFinish();
      }
    } catch (err) {
      console.error("[ОШИБКА В evaluateFunnelStep]:", err);
      setStep('login');
    }
  };

  const checkConsentOrFinish = () => {
    console.log("[Шаг 7] Проверка куда направить пользователя дальше...");
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ssoRedirectUri = urlParams.get('redirect_uri');
      const internalReturnTo = urlParams.get('return_to');

      if (ssoRedirectUri) {
        console.log("[Шаг 9] Обнаружен redirect_uri. Переключаем UI на экран подтверждения (consent)!");
        setStep('consent');
        
      } else if (internalReturnTo) {
        console.log("[Шаг 9] Обнаружен return_to. Проверяем безопасность домена...");
        
        const isRelative = internalReturnTo.startsWith('/');
        let isAllowedDomain = false;
        
        if (!isRelative) {
          try {
            const returnUrl = new URL(internalReturnTo);
            // Разрешаем редирект только на ваш домен и локалхост
            if (returnUrl.hostname === 'kraito.ru' || returnUrl.hostname === 'localhost') {
              isAllowedDomain = true;
            }
          } catch (e) {
            console.error("Невалидный URL в return_to");
          }
        }
        
        if (isRelative || isAllowedDomain) {
          window.location.href = internalReturnTo;
        } else {
          console.warn("Попытка редиректа на недоверенный домен заблокирована!");
          navigate('/dashboard', { replace: true });
        }
        
      } else {
        console.log("[Шаг 9] Нет параметров возврата. Уходим в Dashboard.");
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      console.error("[ОШИБКА В checkConsentOrFinish]:", err);
      navigate('/dashboard', { replace: true });
    }
  };

  const handleAuthSuccess = (token) => {
    setAccessToken(token);
    startSilentRefresh(token);
    evaluateFunnelStep(token);
  };

  const handleEmailConfirmed = (newToken) => {
    setAccessToken(newToken);
    startSilentRefresh(newToken);
    setStep('totp_offer');
  };

  // === ЛОГИКА SSO ===
  const handleApproveSSO = async () => {
    setStep('redirecting');
    setAuthError(null);
    
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUri = urlParams.get('redirect_uri');

    try {
      const response = await apiFetch('/api/v1/sso', { method: 'POST' });
      const ssoCode = response?.code || response?.data?.code || response?.token;

      if (ssoCode) {
        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set('code', ssoCode);
        window.location.href = targetUrl.toString();
      } else {
        setAuthError('Сервер не вернул SSO-код');
        setStep('consent'); 
      }
    } catch (err) {
      console.error("Ошибка SSO:", err);
      setAuthError('Ошибка при авторизации сервиса: ' + err.message);
      setStep('consent');
    }
  };

  const handleDenySSO = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUri = urlParams.get('redirect_uri');
    
    try {
      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set('error', 'access_denied');
      window.location.href = targetUrl.toString();
    } catch (err) {
      navigate('/dashboard', { replace: true });
    }
  };

  // === РЕНДЕР СОСТОЯНИЙ ===

  if (step === 'checking' || step === 'redirecting') {
    return (
      <Center h="100vh" style={{ flexDirection: 'column', gap: 16 }}>
        <Loader size="xl" />
        {step === 'redirecting' && <Text c="dimmed">Выполняется переадресация...</Text>}
      </Center>
    );
  }

  // === ЭКРАН: Подтверждение доступа (Consent) ===
  if (step === 'consent') {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUri = urlParams.get('redirect_uri');
    
    let targetDomain = 'стороннее приложение';
    try {
      targetDomain = new URL(redirectUri).hostname;
    } catch (e) {}

    return (
      <Container size={420} my={40}>
        <Paper 
          withBorder 
          shadow="md" 
          p={30} 
          radius="md" 
          w="100%"        // Фиксируем ширину (занимает все 420px от Container)
          mih={450}       // Фиксируем минимальную высоту
          style={{        // Включаем Flexbox для центрирования контента по вертикали
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center' 
          }}
        >
          <Title order={3} mb="md">Авторизация</Title>
          
          {authError && <Text c="red" size="sm" mb="md">{authError}</Text>}
          
          <Text mb="xl" size="sm">
            Приложение <b>{targetDomain}</b> запрашивает доступ к вашему аккаунту. Вы доверяете этому сервису?
          </Text>
          
          <Group grow>
            <Button color="red" variant="light" onClick={handleDenySSO}>
              Отменить
            </Button>
            <Button onClick={handleApproveSSO}>
              Разрешить
            </Button>
          </Group>
        </Paper>
      </Container>
    );
  }

  if (step === 'email_confirm') {
    return (
      <Container size={420} my={40}>
        <EmailConfirmForm onSuccess={handleEmailConfirmed} />
      </Container>
    );
  }

  if (step === 'totp_offer') {
    return (
      <Container size={420} my={40}>
        <Title order={3} ta="center" mb="md">Усилить безопасность?</Title>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Text size="sm" c="dimmed" mb="md">
            Ваша почта подтверждена. Хотите подключить двухфакторную авторизацию (TOTP) прямо сейчас?
          </Text>
          <TotpSetupForm onSuccess={checkConsentOrFinish} />
          <Button fullWidth variant="subtle" mt="md" onClick={checkConsentOrFinish}>
            Пропустить (настроить позже)
          </Button>
        </Paper>
      </Container>
    );
  }

  // Дефолтный шаг: Вход / Регистрация
  return (
    <Container size={420} my={40}>
      <Paper withBorder shadow="md" p={30} radius="md">
        <Tabs defaultValue="login">
          <Tabs.List grow mb="lg">
            <Tabs.Tab value="login">Вход</Tabs.Tab>
            <Tabs.Tab value="register">Регистрация</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="login">
            <LoginForm onSuccess={handleAuthSuccess} />
          </Tabs.Panel>
          <Tabs.Panel value="register">
            <RegisterForm onSuccess={handleAuthSuccess} />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}