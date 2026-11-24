module.exports = {
  apps: [
    {
      name: 'zenmeter-mes-api',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5555
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5555
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/app.log',
      merge_logs: true
    }
  ]
};
