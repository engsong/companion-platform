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
  await runRemote('su - postgres -c "psql -c \\"ALTER USER postgres WITH PASSWORD \'123456789\';\\""');
  const createDb = await runRemote('su - postgres -c "psql -c \\"CREATE DATABASE companion_db;\\""');
  console.log('Create DB:', createDb.stdout, createDb.stderr);
  
  const grantPriv = await runRemote('su - postgres -c "psql -c \\"GRANT ALL PRIVILEGES ON DATABASE companion_db TO postgres;\\""');
  console.log('Grant privileges:', grantPriv.stdout, grantPriv.stderr);

  const check = await runRemote('su - postgres -c "psql -l"');
  console.log('Databases on server:\n', check.stdout);
}

main().catch(console.error);
