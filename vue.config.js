const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === 'production'
    ? '/Gantt_Demo/'  // 例如 '/my-vue-app/'
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
