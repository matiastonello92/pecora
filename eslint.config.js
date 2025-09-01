// eslint.config.js (flat config)
import next from 'eslint-config-next';

export default [
  {
    ignores: [
      '.next',
      'node_modules',
      'supabase/functions/**',
      'tests/**'
    ],
  },
  ...next(),
];

