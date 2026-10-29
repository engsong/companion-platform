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
  console.log('Checking postgres listening port & conf files...');
  const netstat = await runRemote('ss -tulpn | grep 5432');
  console.log('Port 5432 status:\n', netstat.stdout);

  // Find pg_hba.conf and postgresql.conf
  const confs = await runRemote('su - postgres -c "psql -t -P format=unaligned -c \'SHOW config_file; SHOW hba_file;\'"');
  console.log('Postgres conf paths:\n', confs.stdout);
}

main().catch(console.error);
