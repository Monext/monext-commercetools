export const config = {
  // Required by Payment SDK
  projectKey: process.env.CTP_PROJECT_KEY || 'payment-integration',
  clientId: process.env.CTP_CLIENT_ID || 'xxx',
  clientSecret: process.env.CTP_CLIENT_SECRET || 'xxx',
  jwksUrl: process.env.CTP_JWKS_URL || 'http://localhost:9000/jwt/.well-known/jwks.json',
  jwtIssuer: process.env.CTP_JWT_ISSUER || 'https://mc-api.europe-west1.gcp.commercetools.com',
  authUrl: process.env.CTP_AUTH_URL || 'https://auth.europe-west1.gcp.commercetools.com',
  apiUrl: process.env.CTP_API_URL || 'https://api.europe-west1.gcp.commercetools.com',
  sessionUrl: process.env.CTP_SESSION_URL || 'https://session.europe-west1.gcp.commercetools.com/',
  healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),

  // Required by logger
  loggerLevel: process.env.LOGGER_LEVEL || 'info',

  // Update with specific payment providers config
  monextApiKey: process.env.MONEXT_API_KEY || 'xxx',
  monextEnvironment: process.env.MONEXT_ENVIRONMENT || 'HOMOLOGATION',
  monextPointOfSaleRef: process.env.MONEXT_POINT_OF_SALE_REF || '',
  monextCaptureType: process.env.MONEXT_CAPTURE_TYPE || 'AUTOMATIC',

  // Merchant return URL
  returnUrl: process.env.RETURN_URL || '',
};

export const getConfig = () => {
  return config;
};
