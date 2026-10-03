import { execFileSync } from 'node:child_process';
execFileSync(
  'git',
  ['archive', '--format=zip', '--prefix=FitTrio/', '--output=../FitTrio.zip', 'HEAD'],
  { stdio: 'inherit' },
);
console.log(
  'Created ../FitTrio.zip from committed source. Secrets, node_modules and local records are excluded.',
);
