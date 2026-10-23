import { config } from './config.ts';
import { openDb } from './db.ts';
import { createApp } from './app.ts';

const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`Magubane Labs needs Node.js 22.13 or newer (you have ${process.versions.node}). Install the current LTS from nodejs.org.`);
  process.exit(1);
}

const db = openDb(config.databasePath);
const server = createApp(db);

server.listen(config.port, () => {
  console.log(`\n  Magubane Labs running at http://localhost:${config.port}`);
  console.log(`  Database: ${config.databasePath}`);
  console.log(`  Tutor: ${config.anthropicKey ? `connected (${config.tutorModel})` : 'not connected. Add ANTHROPIC_API_KEY to .env to enable it.'}\n`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
