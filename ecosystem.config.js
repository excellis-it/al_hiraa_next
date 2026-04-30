module.exports = {
  apps: [
    {
      name: 'alhiraa-api',
      cwd: '/var/www/al_hiraa_next/server',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 10034,
      },
      max_memory_restart: '500M',
      out_file: '/var/log/pm2/alhiraa-api-out.log',
      error_file: '/var/log/pm2/alhiraa-api-error.log',
      time: true,
    },
  ],
};
