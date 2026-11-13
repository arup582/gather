#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chownSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
if (existsSync('.env.local')) process.loadEnvFile(resolve(root, '.env.local'));
if (existsSync('.env')) process.loadEnvFile(resolve(root, '.env'));
const env = { ...process.env };
const command = process.argv[2] || 'help';
function fail(message) { throw new Error(message); }
function call(bin, args = [], options = {}) {
  const result = spawnSync(bin, args, { cwd: root, env, encoding: 'utf8', stdio: 'inherit', ...options });
  if (result.error) fail(`${bin}: ${result.error.message}`);
  if (result.status !== 0) fail(`${bin} failed (${result.status ?? result.signal}).`);
  return result.stdout?.trim();
}
function capture(bin, args = []) { return call(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }); }
function find(name, candidates = []) {
  for (const dir of [...(env.PATH || '').split(':'), ...candidates]) {
    if (dir && existsSync(join(dir, name))) return join(dir, name);
  }
  fail(`Missing ${name}. Install/provision it before running this command; this script never downloads tools.`);
}
const pgCandidates = ['/usr/lib/postgresql/16/bin', '/opt/homebrew/opt/postgresql@16/bin', '/usr/local/opt/postgresql@16/bin'];
function javaEnvironment() {
  if (!env.JAVA_HOME && existsSync('/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home'))
    env.JAVA_HOME = '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';
  if (env.JAVA_HOME) env.PATH = `${env.JAVA_HOME}/bin:${env.PATH}`;
  let result = spawnSync(find('java'), ['-version'], { env, encoding: 'utf8' });
  let version = (result.stderr || '') + (result.stdout || '');
  const macJdk = '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home';
  if (!/version "21\./.test(version) && existsSync(macJdk)) {
    env.JAVA_HOME = macJdk;
    env.PATH = `${macJdk}/bin:${env.PATH}`;
    result = spawnSync(join(macJdk, 'bin/java'), ['-version'], { env, encoding: 'utf8' });
    version = (result.stderr || '') + (result.stdout || '');
  }
  if (result.status || !/version "21\./.test(version)) fail('Java 21 is required. Set JAVA_HOME to the installed JDK 21.');
  const maven = env.MVN || find('mvn');
  const mv = capture(maven, ['--version']);
  if (!/Apache Maven 3\.(?:8|9)\./.test(mv)) fail('Use installed Maven 3.8.x or 3.9.x, not a downloading wrapper.');
  return maven;
}
function loadConfiguration() {
  if (!existsSync('.env')) call(process.execPath, ['scripts/init-env.mjs']);
  process.loadEnvFile(resolve(root, '.env'));
  // Explicit shell variables win over the local file, including custom dev ports.
  Object.assign(env, process.env);
  for (const name of ['POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'DEV_SEED_PASSWORD'])
    if (!env[name] || env[name].startsWith('replace_')) fail(`Set ${name} in .env; do not copy the example placeholders unchanged.`);
  for (const name of ['POSTGRES_DB', 'POSTGRES_USER'])
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(env[name])) fail(`${name} must be a simple lowercase PostgreSQL identifier.`);
}
const runtime = resolve(root, '.local-runtime');
const data = resolve(runtime, 'postgres');
const port = Number(env.GATHER_PG_PORT || 55432);
if (!Number.isInteger(port) || port < 1024 || port > 65535) fail('GATHER_PG_PORT must be an unprivileged TCP port.');
function postgres() {
  const bin = find('pg_ctl', pgCandidates);
  if (!/\b16\./.test(capture(bin, ['--version']))) fail('PostgreSQL 16 binaries are required. Set PATH to their bin directory.');
  return { control: bin, init: join(dirname(bin), 'initdb'), sql: join(dirname(bin), 'psql') };
}
function databaseUser() {
  if (typeof process.getuid !== 'function' || process.getuid() !== 0) return null;
  const result = spawnSync('id', ['-u', 'postgres'], { encoding: 'utf8' });
  if (result.status) fail('PostgreSQL cannot run as root. Provision a postgres OS user or run as a non-root user.');
  return { uid: Number(result.stdout.trim()), gid: Number(capture('id', ['-g', 'postgres'])) };
}
function pgCall(bin, args, options = {}) {
  const user = databaseUser();
  if (user) return call(find('runuser'), ['-u', 'postgres', '--', bin, ...args], options);
  return call(bin, args, options);
}
function dbStart() {
  const pg = postgres();
  mkdirSync(runtime, { recursive: true, mode: 0o700 });
  const user = databaseUser();
  if (user) chownSync(runtime, user.uid, user.gid);
  const passwordFile = resolve(runtime, 'admin-password');
  const marker = resolve(runtime, 'gather-native-cluster');
  if (existsSync(data) && !existsSync(marker)) fail('Refusing to manage a PostgreSQL directory not created by Gather.');
  if (!existsSync(passwordFile)) writeFileSync(passwordFile, randomBytes(32).toString('base64url'), { mode: 0o600, flag: 'wx' });
  if (user) chownSync(passwordFile, user.uid, user.gid);
  const adminPassword = readFileSync(passwordFile, 'utf8').trim();
  if (!existsSync(join(data, 'PG_VERSION'))) {
    if (existsSync(data) && readdirSync(data).length) fail('Existing incomplete database directory; inspect it manually before retrying.');
    if (!existsSync(marker)) writeFileSync(marker, 'Private Gather PostgreSQL 16 cluster\n', { flag: 'wx', mode: 0o600 });
    pgCall(pg.init, ['-D', data, '--username=gather_bootstrap', '--encoding=UTF8', '--locale=C', '--auth=scram-sha-256', `--pwfile=${passwordFile}`]);
  }
  if (readFileSync(join(data, 'PG_VERSION'), 'utf8').trim() !== '16') fail('Existing cluster is not PostgreSQL 16.');
  const status = spawnSync(pg.control, ['-D', data, 'status'], {
    env, stdio: 'ignore', ...(user ? { uid: user.uid, gid: user.gid } : {}),
  });
  if (status.status !== 0) {
    pgCall(pg.control, ['-D', data, '-l', resolve(runtime, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -c unix_socket_directories=''`, '-w', 'start']);
  }
  const pgEnv = { ...env, PGHOST: '127.0.0.1', PGPORT: String(port), PGUSER: 'gather_bootstrap', PGPASSWORD: adminPassword,
    GATHER_DB_ROLE: env.POSTGRES_USER, GATHER_DB_PASSWORD: env.POSTGRES_PASSWORD,
    GATHER_DEV_DB: env.POSTGRES_DB, GATHER_TEST_DB: `${env.POSTGRES_DB}_native_test` };
  // Variables are read from the environment, not exposed as command-line passwords.
  const sql = `\\getenv db_role GATHER_DB_ROLE
\\getenv db_password GATHER_DB_PASSWORD
\\getenv dev_db GATHER_DEV_DB
\\getenv test_db GATHER_TEST_DB
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_role', :'db_password') WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'db_role') \\gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'db_role', :'db_password') \\gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'dev_db', :'db_role') WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'dev_db') \\gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'test_db', :'db_role') WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'test_db') \\gexec
`;
  call(pg.sql, ['-X', '-v', 'ON_ERROR_STOP=1', '-d', 'postgres'], { env: pgEnv, input: sql, stdio: ['pipe', 'inherit', 'inherit'] });
  env.DB_URL = `jdbc:postgresql://127.0.0.1:${port}/${env.POSTGRES_DB}`;
  env.DB_USER = env.POSTGRES_USER; env.DB_PASSWORD = env.POSTGRES_PASSWORD;
  env.TEST_DB_URL = `jdbc:postgresql://127.0.0.1:${port}/${env.POSTGRES_DB}_native_test`;
  env.TEST_DB_USER = env.POSTGRES_USER; env.TEST_DB_PASSWORD = env.POSTGRES_PASSWORD;
  console.log(`Native PostgreSQL 16 ready on loopback port ${port}. Development and test databases are separate.`);
}
try {
  if (!/^22\./.test(process.versions.node) || Number(process.versions.node.split('.')[1]) < 21)
    fail('Use Node 22.21 or later in the Node 22 line. Read .nvmrc.');
  if (command === 'help') {
    console.log('node scripts/local.mjs <doctor|db:start|db:stop|backend|test:backend|install:frontend|frontend|test:frontend|test:browser>');
    console.log('Uses installed tools only. Set MVN or JAVA_HOME when needed; optional GATHER_PG_PORT, GATHER_API_PORT and GATHER_WEB_PORT.');
  } else if (command === 'doctor') {
    const maven = javaEnvironment();
    console.log(`Node ${process.versions.node}; Java 21; ${capture(maven, ['--version']).split('\n')[0]}; ${capture(postgres().control, ['--version'])}`);
    console.log('Tools are installed. Internal npm/Maven mirror availability must be checked in the target environment.');
  } else if (command === 'db:stop') {
    if (!existsSync(resolve(runtime, 'gather-native-cluster'))) fail('No Gather-owned native cluster found.');
    pgCall(postgres().control, ['-D', data, '-m', 'fast', '-w', 'stop']);
    console.log('Native database stopped; its data was retained.');
  } else {
    loadConfiguration();
    if (['db:start', 'backend', 'test:backend'].includes(command)) {
      const maven = command === 'db:start' ? null : javaEnvironment();
      dbStart();
      if (command === 'backend') {
        env.SPRING_PROFILES_ACTIVE = 'dev'; env.SERVER_PORT = env.GATHER_API_PORT || '8080';
        env.SERVER_ADDRESS = '127.0.0.1';
        call(maven, ['-B', 'spring-boot:run'], { cwd: resolve(root, 'backend') });
      } else if (command === 'test:backend') {
        console.log('Integration fixtures clear only the dedicated native test database. Do not run concurrent suites.');
        call(maven, ['-B', 'verify', '-Pintegration'], { cwd: resolve(root, 'backend') });
      }
    } else if (command === 'install:frontend') {
      call(find('npm'), ['ci'], { cwd: resolve(root, 'frontend') });
    } else if (command === 'frontend') {
      call(find('npm'), ['run', 'dev'], { cwd: resolve(root, 'frontend') });
    } else if (command === 'test:frontend') {
      for (const task of ['test', 'check', 'build']) call(find('npm'), ['run', task], { cwd: resolve(root, 'frontend') });
    } else if (command === 'test:browser') {
      call(find('npm'), ['run', 'test:e2e'], { cwd: resolve(root, 'frontend') });
    } else fail(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
