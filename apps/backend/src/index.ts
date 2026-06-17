import 'dotenv/config';
import { bootstrap } from '@vendure/core';
import { config } from './vendure-config';

bootstrap(config)
  .then(() => {
    console.log('Vendure server bootstrapped successfully!');
  })
  .catch(err => {
    console.error('Failed to bootstrap Vendure server:', err);
  });
