// eslint.config.js (flat)
import next from 'eslint-config-next';

export default [
  {
    ignores: [
      '.next',
      'node_modules',
      'supabase/functions/**',
      'tests/**',
    ],
  },
  ...next(),
];

