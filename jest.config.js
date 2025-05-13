module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/test"], // Look for tests in the test directory
  testMatch: [
    "**/test/**/*.test.ts", // For .ts files in any subfolder of test/
    "**/test/**/*.spec.ts", // Also include .spec.ts files
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // collectCoverage: true, // Uncomment to enable coverage reports
  // coverageDirectory: "coverage", // Where to output coverage reports
  // coverageReporters: ["json", "lcov", "text", "clover"],
};
