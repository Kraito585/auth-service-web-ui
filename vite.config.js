import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/auth/',
  server: {
    proxy: {
      '/auth/api': {
        target: 'https://api.kraito.ru',
        changeOrigin: true,
        // Переписываем домен в куках
        cookieDomainRewrite: {
          // Звездочка означает "любой домен". 
          // Пустая строка удалит атрибут Domain, сделав куку валидной для localhost
          "*": "" 
        }
      }
    }
  }
})