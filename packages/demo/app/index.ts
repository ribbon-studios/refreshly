import { config } from 'dotenv';
import path from 'node:path';
import { DotEnv, LogLevel, Logger, Refreshly } from '@refreshly/core';
import { GitLab } from '@refreshly/gitlab';

Logger.setLevel(LogLevel.INFO);

const rootDotEnv = path.join(process.cwd(), '../..', '.env');

// Load .env from the root of the project
config({
  path: rootDotEnv,
});

Refreshly(
  new GitLab.Source({
    targets: [
      new DotEnv.Target({
        file: rootDotEnv,
      }),
      new GitLab.Target({
        prefix: 'CI_ONLY_',
        ids: ['48414121'],
      }),
    ],
  })
);
