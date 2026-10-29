const { Client } = require('ssh2');

function runRemote(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, stdout, stderr });
        }).on('data', (d) => stdout += d).stderr.on('data', (d) => stderr += d);
      });
    }).on('error', reject).connect({
      host: '150.95.30.215',
      port: 22,
      username: 'root',
      password: 'Changeme1!2@',
      readyTimeout: 10000
    });
  });
}

async function main() {
  console.log('Allowing Docker network to connect to host Postgres...');
  // 1. Allow 172.17.0.0/16 in pg_hba.conf if not already present
  await runRemote(`grep -q "172.17.0.0/16" /etc/postgresql/16/main/pg_hba.conf || echo "host companion_db postgres 172.17.0.0/16 md5" >> /etc/postgresql/16/main/pg_hba.conf`);
  await runRemote(`grep -q "172.18.0.0/16" /etc/postgresql/16/main/pg_hba.conf || echo "host companion_db postgres 172.18.0.0/16 md5" >> /etc/postgresql/16/main/pg_hba.conf`);

  // 2. Ensure postgresql.conf listens on all or includes 172.17.0.1
  await runRemote(`sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf`);
  await runRemote(`sed -i "s/^listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/16/main/postgresql.conf`);

  // Reload postgresql
  await runRemote('systemctl reload postgresql');

  // Verify
  const ports = await runRemote('ss -tulpn | grep 5432');
  console.log('Port 5432 after config:\n', ports.stdout);
}

main().catch(console.error);
