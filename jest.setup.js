// Increase the default timeout for all tests
jest.setTimeout(30000);

// Add any global test setup here
beforeAll(() => {
  // Global setup before all tests
});

afterAll(() => {
  // Global teardown after all tests
});

beforeEach(() => {
  // Setup before each test
  jest.resetModules();
  jest.clearAllMocks();
});

afterEach(() => {
  // Teardown after each test
});