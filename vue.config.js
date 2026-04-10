const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  css: {
    loaderOptions: {
      sass: {
        additionalData: `@use '@/styles/variables' as *;`,
      },
      scss: {
        additionalData: `@use '@/styles/variables' as *;`,
      },
    },
  },
  publicPath: process.env.NODE_ENV === 'production'
    ? '/fpcc-vessel-scheduler/'
    : '/',
  devServer: {
    proxy: {
      '/api-proxy': {
        target: 'http://10.110.196.72:6767',
        changeOrigin: true,
        pathRewrite: { '^/api-proxy': '' },
      },
    },
  },
})
