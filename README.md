# [![Monext Logo](doc/logo-monext.svg)](https://www.monext.fr/)

# Monext Commercetools Connector

---

## Table of Content

---

- [Overview](#overview)
- [Template Features](#template-features)
- [Prerequisite](#prerequisite)
- [Getting started](#getting-started)
  - [Development of Enabler](./enabler/README.md)
  - [Development of Processor](./processor/README.md)
- [Deployment Configuration](#deployment-configuration)
- [Additional resources for developers](#additional-resources-for-developers)
- [License](#license)
- [Contact and support](#contact-and-support)

## Overview

This repository provides a [connect](https://docs.commercetools.com/connect) template for payment integration connector. This boilerplate code acts as a starting point for integration with external payment service provider.

## Template Features

- Typescript language supported.
- Uses Fastify as web server framework.
- Uses [commercetools SDK](https://docs.commercetools.com/sdk/js-sdk-getting-started) for the commercetools-specific communication.
- Uses [connect payment SDK](https://github.com/commercetools/connect-payments-sdk) to manage request context, sessions and JWT authentication.
- Includes local development utilities in npm commands to build, start, test, lint & prettify code.

## Prerequisite

#### 1. commercetools composable commerce API client

Users are expected to create API client responsible for payment management in composable commerce project. Details of the API client are taken as input as environment variables/ configuration for connect such as `CTP_PROJECT_KEY` , `CTP_CLIENT_ID`, `CTP_CLIENT_SECRET`. For details, please read [Deployment Configuration](./README.md#deployment-configuration).
In addition, please make sure the API client should have enough scope to be able to manage payment. For details, please refer to [Running Application](./processor/README.md#running-application).

#### 2. various URLs from commercetools composable commerce

Various URLs from commercetools platform are required to be configured so that the connect application can handle session and authentication process for endpoints.
Their values are taken as input as environment variables/configuration for connect with variable names `CTP_API_URL`, `CTP_AUTH_URL` and `CTP_SESSION_URL`.

#### 3. Monext account credentials and configurations

An API key provided by Monext is necessary to be configured so that the requests from the connect application can be authenticated by Monext platform within the integration. It's value is taken as input as environment variables/configuration for connect with variable name `MONEXT_API_KEY`.

Additionally, some other configuration options provided by Monext and defined by the marchant are required. Their values are taken as input as environment variables/configuration for connect with variable names `MONEXT_ENVIRONMENT`, `MONEXT_POINT_OF_SALE_REF`, `MONEXT_CAPTURE_TYPE`.

## Getting started

The connector contains two modules:

- Enabler: Acts as a wrapper implementation in which frontend components from PSPs embedded. It provides a JS component that renders a checkout button. The connector library can be loaded directly on frontend than the PSP one. Currently is not compatible with commercetools checkout.

  Regarding the development of enabler module, please refer to the following documentations:

  - [Development of Enabler](./enabler/README.md)

- Processor : Acts as backend services which is middleware to 3rd party PSPs to be responsible for managing transactions with PSPs and updating payment entity in composable commerce. `connect-payment-sdk` will be offered to be used in connector to manage request context, sessions and other tools necessary to transact.

  Regarding the development of processor module, please refer to the following documentations:

  - [Development of Processor](./processor/README.md)

## Deployment Configuration

In order to deploy your customized connector application on commercetools Connect, it needs to be published. For details, please refer to [documentation about commercetools Connect](https://docs.commercetools.com/connect/concepts)
In addition, in order to support connect, the tax integration connector template has a folder structure as listed below:

```
├── enabler
│   ├── src
│   ├── test
│   └── package.json
├── processor
│   ├── src
│   ├── test
│   └── package.json
└── connect.yaml
```

Connect deployment configuration is specified in `connect.yaml` which is required information needed for publishing of the application. Following is the deployment configuration used by full ingestion and incremental updater modules:

```
deployAs:
  - name: processor
    applicationType: service
    endpoint: /
    configuration:
      standardConfiguration:
        - key: CTP_PROJECT_KEY
          description: Commercetools project key
          required: true
        - key: CTP_CLIENT_ID
          description: Commercetools client ID
          required: true
        - key: CTP_AUTH_URL
          description: Commercetools Auth URL
          required: true
        - key: CTP_API_URL
          description: Commercetools API URL
          required: true
        - key: CTP_SESSION_URL
          description: Session API URL
          required: true
        - key: CTP_JWKS_URL
          description: JWKs url
          required: true
        - key: CTP_JWT_ISSUER
          description: JWT Issuer for jwt validation
          required: true
        - key: MONEXT_ENVIRONMENT
          description: Monext environment
          required: true
        - key: MONEXT_POINT_OF_SALE_REF
          description: Monext point of sale reference
          required: true
        - key: MONEXT_CAPTURE_TYPE
          description: Monext capture type
          required: true
        - key: RETURN_URL
          description: Merchant return URL
          required: true
      securedConfiguration:
        - key: MONEXT_API_KEY
          description: Monext API Key
          required: true
        - key: CTP_CLIENT_SECRET
          description: Commercetools client secret
          required: true
  - name: enabler
    applicationType: assets
```

Here you can see the details about the variables in configuration:

- `CTP_PROJECT_KEY`: The key of commercetools composable commerce project.
- `CTP_CLIENT_ID`: The client ID of your commercetools composable commerce user account. It is used in commercetools client to communicate with commercetools composable commerce via SDK. Expected scopes are: `manage_payments` `manage_orders` `view_sessions` `view_api_clients` `manage_checkout_payment_intents` `introspect_oauth_tokens` `manage_customers`.
- `CTP_CLIENT_SECRET`: The client secret of commercetools composable commerce user account. It is used in commercetools client to communicate with commercetools composable commerce via SDK.
- `CTP_AUTH_URL`: The URL for authentication in commercetools platform. It is used to generate OAuth 2.0 token which is required in every API call to commercetools composable commerce. The default value is `https://auth.europe-west1.gcp.commercetools.com`. For details, please refer to documentation [here](https://docs.commercetools.com/tutorials/api-tutorial#authentication).
- `CTP_API_URL`: The URL for commercetools composable commerce API. Default value is `https://api.europe-west1.gcp.commercetools.com`.
- `CTP_SESSION_URL`: The URL for session creation in commercetools platform. Connectors relies on the session created to be able to share information between enabler and processor. The default value is `https://session.europe-west1.gcp.commercetools.com`.
- `CTP_JWKS_URL`: The URL which provides JSON Web Key Set. Default value is `https://mc-api.europe-west1.gcp.commercetools.com/.well-known/jwks.json`.
- `CTP_JWT_ISSUER`: The issuer inside JSON Web Token which is required in JWT validation process. Default value is `https://mc-api.europe-west1.gcp.commercetools.com`
- `RETURN_URL`: Merchant return URL for redirecting the user back to the merchant website after the payment is completed. Use it as a fallback if no merchantReturnUrl is provided in the session.
- `MONEXT_POINT_OF_SALE_REF`: Point of sale refs are in JSON format if there is multiple associated stores. If there is only one REF for all stores or for all commercetools project, use the REF as string.

```
// string - single REF for all stores or for all commercetools project.
MONEXT_POINT_OF_SALE_REF: ref1;
// string JSON valid - if multiple refs for multiple stores
#MONEXT_POINT_OF_SALE_REF: {
   "storeKey1": "ref1",
   "storeKey2": "ref2"
}
```

- `MONEXT_CAPTURE_TYPE`: Can be AUTOMATIC or MANUAL. Capture types are in JSON format if there is multiple associated stores. If there is only one Capture type for all stores or for all commercetools project, use the Capture type as string.

```
// string - single capture type for all stores or for all commercetools project
MONEXT_CAPTURE_TYPE: "AUTOMATIC";
// string JSON valid - if multiple Capture types for multiple stores
#MONEXT_CAPTURE_TYPE: {
   "storeKey1": "AUTOMATIC",
   "storeKey2": "MANUAL"
}
```

- `MONEXT_ENVIRONMENT`: HOMOLOGATION or PRODUCTION. Monext environment are in JSON format if there is multiple associated stores. If there is only one environment for all stores or for all commercetools project, use the environment as string. When using operations/status endpoint, the call for Monext API status endpoint uses: the single environment value or the environment defined in the first key of the JSON file or HOMOLOGATION by default.

```
// string - single environment for all stores or for all commercetools project
MONEXT_ENVIRONMENT: "HOMOLOGATION";
// string JSON valid - if multiple environments for multiple stores
#MONEXT_ENVIRONMENT: {
   "storeKey1": "HOMOLOGATION",
   "storeKey2": "PRODUCTION"
}
```

## Additional resources for developers

To learn more about how the API used by the plugin and how to modify or use Commercetools with it to fit your needs:

- [Monext API documentation](https://api-docs.retail.monext.com/reference/getting-started-with-your-api)
- [Commercetools Composable Commerce Documentation](https://docs.commercetools.com/docs/composable-commerce)

## License

This plugin's source code is completely free and released under the terms of the MIT license.

## Contact and support

If you want to contact us, the best way is through [this page on our website](https://www.monext.fr/gardons-le-contact) and send us your question(s).

We guarantee that we answer as soon as we can!

If you need support you can also directly check our FAQ section and contact us [on the support page](https://support.payline.com/hc/fr).
