export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  ssr: false,
  app: {
    head: {
      title: 'Mosaic Agent',
      meta: [
        { name: 'description', content: 'AI Agent Interface' }
      ]
    }
  }
})
