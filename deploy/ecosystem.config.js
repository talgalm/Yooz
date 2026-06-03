module.exports = {
  apps: [
    {
      name: 'yooz',
      script: 'dist/index.js',
      cwd: '/opt/yooz/server',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/etc/yooz/prod.env',
      error_file: '/var/log/yooz/error.log',
      out_file: '/var/log/yooz/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
