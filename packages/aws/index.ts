import { AccessKey, CreateAccessKeyCommand, DeleteAccessKeyCommand, IAMClient } from '@aws-sdk/client-iam';
import { SourceModule, KeyInfo, getEnv } from '@refreshly/core';
import * as assert from 'assert';

class AWSSourceModule extends SourceModule {
  #options: AWSSourceModule.Options;
  #accessKey?: AccessKey;

  constructor({ targets, key, secretKey, ...options }: AWSSourceModule.RawOptions) {
    super({ targets });

    this.#options = {
      ...options,
      key: getEnv('key', key, 'AWS_ACCESS_KEY_ID'),
      secretKey: getEnv('secretKey', secretKey, 'AWS_SECRET_ACCESS_KEY'),
    };
  }

  get originalKeyInfos(): KeyInfo[] {
    return [
      {
        name: 'AWS_ACCESS_KEY_ID',
        value: this.#options.key,
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        value: this.#options.secretKey,
      },
    ];
  }

  async source(): Promise<KeyInfo[]> {
    const client = new IAMClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.#options.key,
        secretAccessKey: this.#options.secretKey,
      },
    });

    const { AccessKey } = await client.send(
      new CreateAccessKeyCommand({
        UserName: 'rain-ci',
      })
    );

    this.#accessKey = AccessKey;

    return [
      {
        name: 'AWS_ACCESS_KEY_ID',
        value: this.#accessKey.AccessKeyId,
      },
      {
        name: 'AWS_SECRET_ACCESS_KEY',
        value: this.#accessKey.SecretAccessKey,
      },
    ];
  }

  async revert(): Promise<void> {
    if (!this.#accessKey) return;

    // Retain the old key and cleanup the new key
    const client = new IAMClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.#options.key,
        secretAccessKey: this.#options.secretKey,
      },
    });

    await client.send(
      new DeleteAccessKeyCommand({
        AccessKeyId: this.#accessKey.AccessKeyId,
      })
    );
  }

  async cleanup(): Promise<void> {
    assert.ok(this.#accessKey);

    // Retain the new key and cleanup the old key
    const client = new IAMClient({
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.#accessKey.AccessKeyId,
        secretAccessKey: this.#accessKey.SecretAccessKey,
      },
    });

    await client.send(
      new DeleteAccessKeyCommand({
        AccessKeyId: this.#options.key,
      })
    );
  }
}

namespace AWSSourceModule {
  export type Options = {
    key?: string;
    secretKey?: string;
    user: string;
  };

  export type RawOptions = Options & SourceModule.Options;
}

export const AWS = {
  Source: AWSSourceModule,
};