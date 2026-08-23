import { Routes, Route, Navigate } from 'react-router-dom';
import { Center, Box } from '@mantine/core';
import { AuthFlow } from './pages/AuthFlow';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    // Обертка на весь экран с легким фоном (адаптируется под светлую/темную тему Mantine)
    <Box bg="var(--mantine-color-body)" style={{ minHeight: '100vh' }}>
      <Center h="100vh">
        <Routes>
          <Route path="/auth" element={<AuthFlow />} />
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Любой левый путь кидает в воронку */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Center>
    </Box>
  );
}

export default App;