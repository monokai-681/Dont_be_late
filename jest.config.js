/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  verbose: true,
  clearMocks: true,
  collectCoverageFrom: ['src/engine/**/*.ts'],
  coverageReporters: ['text-summary'],
  testTimeout: 30_000,
};
