/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  clearMocks: true,
  collectCoverageFrom: ['src/engine/**/*.ts'],
  coverageReporters: ['text-summary'],
  testTimeout: 30_000, // snooze 1500 万次不跳号测试需要时间
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
