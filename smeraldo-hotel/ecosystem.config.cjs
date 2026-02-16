module.exports = {
  apps: [{
    name: 'manage-smeraldo-hotel',
    script: 'build/index.js',
    cwd: '/var/www/manage-smeraldo-hotel/smeraldo-hotel',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '127.0.0.1'
    },
    env_file: '/var/www/manage-smeraldo-hotel/smeraldo-hotel/.env'
  }]
};
