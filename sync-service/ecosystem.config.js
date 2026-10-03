module.exports = {
  apps: [
    {
      name: 'couchdb-postgres-sync',
      script: './couchdb-postgres-sync.js',
      args: '--watch',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/sync-error.log',
      out_file: './logs/sync-output.log',
      log_file: './logs/sync-combined.log',
      time: true,
      merge_logs: true
    }
  ]
};
