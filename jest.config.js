// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  // Sin globals
  collectCoverage: true,
  coverageReporters: ["text"],
  coveragePathIgnorePatterns: ["/tests/mocks/"],
  coverageThreshold: {
  global: { branches: 80, functions: 65, lines: 80, statements: 80 }, // Temporal
},
};