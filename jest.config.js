// jest.config.js
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Sin globals
  collectCoverage: true,
  coverageReporters: ["text"],
  coveragePathIgnorePatterns: ["/tests/mocks/"],
  coverageThreshold: {
    global: { branches: 80, functions: 65, lines: 80, statements: 80 }, // Temporal
  },
};
