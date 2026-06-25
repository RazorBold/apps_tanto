module.exports = {
  apps: [{
    name: 'solar-tracker',
    script: 'server.js',
    env: {
      PORT: 5031,
      DATA_DIR: '/data',
      JWT_SECRET: 'GANTI_INI_DENGAN_STRING_ACAK'
    },
    watch: false,
    autorestart: true,
    max_restarts: 5
  }]
};
