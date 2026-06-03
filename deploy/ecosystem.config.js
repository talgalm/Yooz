const fs = require('fs');

/** PM2 cluster mode does not always apply env_file; inject vars explicitly. */
function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  const env = {};
  for (const line of fs.readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

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
      env: loadEnvFile('/etc/yooz/prod.env'),
      error_file: '/var/log/yooz/error.log',
      out_file: '/var/log/yooz/out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
