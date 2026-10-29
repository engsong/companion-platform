const { Client } = require('ssh2');

const conn = new Client();

console.log('Connecting to 150.95.30.215 via SSH...');

conn.on('ready', () => {
  console.log('SSH Connection SUCCESSFUL!');
  conn.exec('uname -a && which docker && which psql && systemctl is-active postgresql 2>/dev/null', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('close', (code, signal) => {
      console.log('Command exit code:', code);
      console.log('Output:\n', output);
      conn.end();
    }).on('data', (data) => {
      output += data;
    }).stderr.on('data', (data) => {
      output += data;
    });
  });
}).on('error', (err) => {
  console.error('SSH Connection Failed:', err.message);
}).connect({
  host: '150.95.30.215',
  port: 22,
  username: 'root',
  password: 'Changeme1!2@',
  readyTimeout: 10000
});
