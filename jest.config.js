module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/apps/dashboard/src/**/*.test.js"],
  collectCoverage: true,
  collectCoverageFrom: ["apps/dashboard/src/**/*.js", "!apps/dashboard/src/**/*.test.js"],
  coverageDirectory: "docs/coverage",
  coverageReporters: ["text", "lcov", "html", "json-summary"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
