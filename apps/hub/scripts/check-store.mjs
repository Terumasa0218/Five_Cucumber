const base = process.env.BASE_URL ?? 'http://localhost:3000';

fetch(`${base}/api/_diag/shared-store`)
  .then((r) => r.json())
  .then((j) => {
    console.log('diag:', j);
    if (j.canPersist) {
      console.log('persist-ok');
    } else {
      console.log('persist-failed');
      process.exitCode = 1;
    }
  })
  .catch((e) => {
    console.error('diag-failed', e);
    process.exitCode = 1;
  });
