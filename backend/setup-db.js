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
  console.log('Checking and setting up PostgreSQL database...');
  // Ensure service is running
  await runRemote('systemctl start postgresql && systemctl enable postgresql');
  
  // Create database companion_db and set password for postgres
  const sqlCommands = `
    ALTER USER postgres WITH PASSWORD '123456789';
    SELECT 'CREATE DATABASE companion_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'companion_db')\\gexec
    GRANT ALL PRIVILEGES ON DATABASE companion_db TO postgres;
  `;

  const res = await runRemote(`su - postgres -c "psql -c \\"${sqlCommands.replace(/\n/g, ' ')}\\""`);
  console.log('PostgreSQL Output:\n', res.stdout, res.stderr);

  // Verify list of databases
  const checkDb = await runRemote('su - postgres -c "psql -l"');
  console.log('Databases on server:\n', checkDb.stdout);
}

main().catch(console.error);
