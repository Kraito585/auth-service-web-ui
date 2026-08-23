import { Container, Paper, Title, Text, Button } from '@mantine/core';
import { clearAccessToken } from '../authStore';

export function Dashboard() {
  const handleLogout = () => {
    clearAccessToken();
    window.location.href = '/auth'; // Принудительно выкидываем на старт
  };

  return (
    <Container size="md" my={40}>
      <Title order={2} mb="md">Панель управления (Заглушка)</Title>
      
      <Paper withBorder shadow="sm" p="md" radius="md">
        <Text fw={500} mb="sm">Вы успешно прошли воронку авторизации!</Text>
        <Text c="dimmed" size="sm" mb="md">
          Почта подтверждена. Этот экран доступен только для полностью авторизованных пользователей. 
          В будущем здесь будут настройки API-ключей и управления аккаунтом.
        </Text>

        <Button variant="light" color="red" onClick={handleLogout}>
          Выйти
        </Button>
      </Paper>
    </Container>
  );
}