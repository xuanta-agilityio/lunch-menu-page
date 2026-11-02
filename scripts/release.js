// Releases the code to the live deployments. The access level is stored in each
// Apps Script version's manifest, so each deployment needs its own version:
//   company: src/appsscript.json as committed (DOMAIN)
//   public:  the same manifest with access ANYONE_ANONYMOUS
//
// Usage: node scripts/release.js "what changed" [company] [public]
// With neither target named, both are released. Tests must pass first.
// Afterwards the editor's HEAD is left on the committed DOMAIN manifest.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'src', 'appsscript.json');

const [description, ...targets] = process.argv.slice(2);
if (!description || targets.some((t) => !['company', 'public'].includes(t))) {
  console.error('Usage: node scripts/release.js "what changed" [company] [public]');
  process.exit(1);
}

function run(command) {
  console.log('> ' + command);
  const res = spawnSync(command, { cwd: ROOT, encoding: 'utf8', shell: true });
  process.stdout.write(res.stdout || '');
  process.stderr.write(res.stderr || '');
  if (res.status !== 0) throw new Error('Failed: ' + command);
  return res.stdout;
}

const CLASP = process.platform === 'win32' ? 'clasp.cmd' : 'clasp';
const config = fs.readFileSync(path.join(ROOT, 'src', 'Config.js'), 'utf8');
const deploymentId = (name) => (new RegExp(name + ":\\s*'([^']*)'").exec(config) || [])[1];
const DEPLOYMENTS = {
  company: { id: deploymentId('COMPANY_DEPLOYMENT_ID'), access: 'DOMAIN' },
  public: { id: deploymentId('PUBLIC_DEPLOYMENT_ID'), access: 'ANYONE_ANONYMOUS' }
};

const committed = fs.readFileSync(MANIFEST, 'utf8');
const quote = (s) => '"' + s.replace(/"/g, '') + '"';

/** Pushes the code with this access level and creates a version; returns its number. */
function createVersion(access) {
  const manifest = JSON.parse(committed);
  manifest.webapp.access = access;
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  run(CLASP + ' push --force');
  const created = /Created version (\d+)/.exec(run(CLASP + ' create-version ' + quote(description + ' (' + access + ')')));
  if (!created) throw new Error('No version number from clasp');
  return created[1];
}

run('npm test');
try {
  for (const target of targets.length ? targets : ['company', 'public']) {
    const { id, access } = DEPLOYMENTS[target];
    const version = createVersion(access);
    // With no ID yet, this is the first public release: create the deployment by hand.
    run(id
      ? CLASP + ' update-deployment ' + id + ' --versionNumber ' + version + ' --description ' + quote(description)
      : CLASP + ' create-deployment --versionNumber ' + version + ' --description ' + quote(description));
  }
} finally {
  fs.writeFileSync(MANIFEST, committed);
  run(CLASP + ' push --force');
}
run(CLASP + ' list-deployments');
