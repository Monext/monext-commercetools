# Payment Integration Processor

This module provides an application based on [commercetools Connect](https://docs.commercetools.com/connect), which is triggered by HTTP requests from Checkout UI for payment operations.

The corresponding payment, cart or order details would be fetched from composable commerce platform, and then be sent to external PSPs for various payment operations such as create/capture/cancel/refund payment.

The module also provides template scripts for post-deployment and pre-undeployment action. After deployment or before undeployment via connect service completed, customized actions can be performed based on users' needs.

## Getting Started

These instructions will get you up and running on your local machine for development and testing purposes.
Please run following npm commands under `processor` folder.

#### Install dependencies

```
$ npm install
```

#### Build the application in local environment. NodeJS source codes are then generated under dist folder

```
$ npm run build
```

#### Run automation test

```
$ npm run test
```

#### Run the application in local environment. Remind that the application has been built before it runs

```
$ npm run start
```

#### Fix the code style

```
$ npm run lint:fix
```

#### Verify the code style

```
$ npm run lint
```

#### Run post-deploy script in local environment

```
$ npm run connector:post-deploy
```

#### Run pre-undeploy script in local environment

```
$ npm run connector:pre-undeploy
```

## Running application

Setup correct environment variables: check `processor/src/config/config.ts` for default values.

Make sure commercetools client credential have at least the following permissions:

- `manage_payments`
- `manage_orders`
- `manage_customers`
- `manage_checkout_payment_intents`
- `view_sessions`
- `introspect_oauth_tokens`

```
npm run dev
```

## Authentication

Some of the services have authentication mechanism.

- `oauth2`: Relies on commercetools OAuth2 server.
- `session`: Relies on commercetools session service.
- `jwt`: Relies on the jwt token injected by the merchant center via the forward-to proxy.

### OAuth2

OAuth2 token can be obtained from commercetools OAuth2 server. It requires API Client created beforehand. For details, please refer to [Requesting an access token using the Composable Commerce OAuth 2.0 service](https://docs.commercetools.com/api/authorization#requesting-an-access-token-using-the-composable-commerce-oauth-20-service).

### Session

Payment connectors relies on session to be able to share information between `enabler` and `processor`.
To create session before sharing information between these two modules, please execute following request to commercetools session service. This code snippet can be used in your custom application as well.

```
POST https://session.<region>.commercetools.com/<commercetools-project-key>/sessions
Authorization: Bearer <oauth token with manage_sessions scope>

{
  "cart": {
    "cartRef": {
      "id": "<cart-id>"
    }
  },
  "metadata": {
    processorUrl: "<processor-url>",
    merchantReturnUrl: "<merchant-return-url>",
    "allowedPaymentMethods": ["Monext"],
  }
}
```

Afterwards, session ID can be obtained from response, which is necessary to be put as `x-session-id` inside request header when sending request to endpoints such as `/operations/config` and `/payment`.

```
# Start a payment using X-Session-Id

export const submit = async (
  paymentMethod: string,
  languageCode: string,
  sessionId: string
) => {
  const requestData = {
    paymentMethod: paymentMethod,
    languageCode,
  };
  const response = await fetch(
    import.meta.env.VITE_PROCESSOR_URL + "/payment",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": sessionId,
      },
      body: JSON.stringify(requestData),
    }
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error("Some error occurred. Please try again.");
  }
  return data;
};
```

### JSON web token (JWT)

`jwt` needs some workaround to be able to test locally as it depends on the merchant center forward-to proxy.

In order to make easy running the application locally, following commands help to build up a jwt mock server:

#### Set environment variable to point to the jwksUrl

```
export CTP_JWKS_URL="http://localhost:9000/jwt/.well-known/jwks.json"

```

#### Run the jwt server

```
docker compose up -d

```

#### Obtain JWT

```
# Request token

curl --location 'http://localhost:9000/jwt/token' \
--header 'Content-Type: application/json' \
--data '{
  "iss": "https://mc-api.europe-west1.gcp.commercetools.com",
  "sub": "subject",
  "https://mc-api.europe-west1.gcp.commercetools.com/claims/project_key": "<commercetools-project-key>"
}'

```

Token can be found in response.

```
{"token":"<token>"}

```

Use the token to authenticate requests protected by JWT: `Authorization: Bearer <token>`.

## APIs

The processor exposes following endpoints to execute various operations with Monext platform:

| endpoints      | Method | URL                                    | Call Monext API | Use Payment Id | Authentication Method                                 |
| ------------------ | ------ | -------------------------------------- | --------------- | -------------- | ----------------------------------------------------- |
| config             | GET    | /operations/config                     | No              | No             | SessionHeaderAuthenticationHook                       |
| status             | GET    | /operations/status                     | Yes             | No             | JWTAuthenticationHook                                 |
| Supported Payments | GET    | /operations/payment-components         | No              | No             | JWTAuthenticationHook                                 |
| createPayment      | POST   | /payment                               | Yes             | Yes            | SessionHeaderAuthenticationHook                       |
| confirmPayment     | GET    | /return                                | Yes             | Yes            | SessionQueryParamAuthenticationHook                   |
| notifyPayment      | GET    | /notification/:paymentId               | Yes             | Yes            | SessionQueryParamAuthenticationHook                   |
| transactions       | POST   | /operations/payment-intents/:paymentId | Yes             | Yes            | Oauth2AuthenticationHook + AuthorityAuthorizationHook |

### GET config

Exposes configuration to the frontend such as `environment`. Requires the header X-Session-Id within the GET request.

```
headers: {
  "X-Session-Id": sessionId,
},

```

#### Endpoint

`GET /operations/config`

#### Request Parameters

N/A

#### Response Parameters

It returns an object with `environment` as key-value pair as below:

```
{
  environment: <environment>
}

```

### GET status

It provides health check feature for checkout front-end so that the correctness of configurations can be verified.

#### Endpoint

`GET /operations/status`

#### Request Parameters

N/A

#### Response Parameters

It returns following attributes in response:

- status: It indicates the health check status. It can be `OK`, `Partially Available` or `Unavailable`.
- timestamp: The timestamp of the status request.
- version: Current version of the payment connector.
- checks: List of health check result details. It contains health check result with various external system including commercetools composable commerce and Monext payment services provider.

```
{
  # Response example

  "status": "OK",
  "timestamp": "2024-07-30T13:30:40.152Z",
  "version": "3.0.2",
  "metadata": {
  "name": "payment-integration-monext",
  "description": "Payment integration with Monext",
  "@commercetools/connect-payments-sdk": "0.8.2"
  },
  "checks": [
    {
      "name": "commercetools permissions",
      "status": "UP",
      "details": {
        "scope": "manage_payments:ct-monext view_orders:ct-monext manage_orders:ct-monext view_payments:ct-monext manage_checkout_payment_intents:ct-monext view_sessions:ct-monext manage_customers:ct-monext view_customers:ct-monext view_api_clients:ct-monext introspect_oauth_tokens:ct-monext"
      }
    },
    {
      "name": "Monext Payment API",
      "status": "UP",
      "details": {
        "paymentMethods": "monext"
      },
      "message": "Monext API is working"
    }
  ]
}

```

- metadata: It lists a collection of metadata including the name/description of the connector and the version of SDKs used to connect to external system.


### Get supported payment components

Private endpoint protected by JSON Web Token that exposes the payment methods supported by the connector so that checkout application can retrieve the available payment components.

#### Endpoint

`GET /operations/payment-components`

#### Request Parameters

N/A

#### Response Parameters

Now the connector supports the dropin type `hpp`

```
{
    "dropins": [
        {
            "type": "hpp"
        }
    ],
    "components": []
}
```

### POST createPayment

Endpoint called by the merchant to provide the data for payment creation payment creation in the Monext API.

#### Endpoint

`POST /payment`

#### Request Parameters

```
{
  languageCode?: <Language-of-payment-hosted-page>,
}
```

The language by default is EN.

#### Response Parameters

It returns following attributes in response:

- redirectURL: Return two possibles URL, the payment hosted page URL or the merchant return URL with paymentReference = `paymentsId` as query parameter.

```
{
  redirectURL: <url-to-redirect>
}
```

In the front of the merchant site a redirect is required. This redirect is already included within the enabler code.

```
submit("monext", languageCode, sessionId).then((data) => {
      if (data.redirectURL) {
        window.location.replace(data.redirectURL);
      } else {
        throw new Error("Some error occurred. Please try again.");
      }
    });
```

### GET confirmPayment

Confirms a payment by updating the payment in Commercetools and the Monext API.

#### Endpoint

`GET /return`

#### Query Parameters

```
{
    paylinetoken: <monext-session-id>,
    paymentReference: <paymentId>
}
```

#### Response Parameters

It returns following attributes in response:

- paymentReference: The Commercetools payment id reference.
- returnUrl: Merchant return url configured in the connector environment variables. Includes `paymentReference = paymentsId` as query parameter.

```
{
  paymentReference: <paymentId>,
  returnUrl: <merchant-return-url>
}
```

If this module is implemented without Commercetools Checkout, the query parameter `paymentReference` can be used for recovering the Cart Id [Using Query Carts and passing `paymentReference` as QueryPredicate](https://docs.commercetools.com/api/projects/carts#query-carts).

Once you have the Cart Id, you can [use the endpoint for Create order from cart](https://docs.commercetools.com/api/projects/orders#create-order-from-cart).

```
# Payload example for create order from cart

const body = {
      cart: {
        id: <cart-id>,
        typeId: "cart",
      },
      paymentState: <payment-status>,
      shipmentState: <shipment-status>,
      orderState; <order-status>,
      version: <cart-version>,
    };
```

### GET notifyPayment

Notifies the payment to the processor when the confirmPayment method is not called.

#### Endpoint

`GET /notification/{paymentId}`

#### Request Parameters

```
{
    paymentId: <payment-reference>;
}
```

#### Query Parameters

```
{
    notificationType: <Monext-notification-type>,
    token: <monext-session-id>,
    paymentEndpoint: <Monext-payment-endpoint>
}
```

Currently, notificationType and paymentEndpoint are not being used in the module.

#### Response Parameters

It returns following attributes in response:

- status: String with information about the payment status.
- type: Transaction type. `Authorization` or `Charge`.

```
{
    status: <payment-status>,
    type: <transaction-type>
}
```

### POST Transactions

Private endpoint called by the merchant to support various payment update requests such as cancel/refund/capture payment. It is protected by `manage_checkout_payment_intents` access right of composable commerce OAuth2 token.

#### Endpoint

`POST /operations/payment-intents/{paymentsId}`

#### Request Parameters

The request payload is different based on different update operations:

##### Cancel Payment

```
{
  actions: [
    {
      action: "cancelPayment",
    }
  ]
}
```

Important: You cannot request to cancel the authorization for a Payment that has already been captured. [Checkout API documentation](https://docs.commercetools.com/checkout/payments-api).

##### Capture Payment

- centAmount: Amount in the smallest indivisible unit of a currency. For example, 5 EUR is specified as 500 while 5 JPY is specified as 5.
- currencyCode: Currency code compliant to [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217).

```

{
  actions: [
    {
      action: "capturePayment",
      amount: {
        centAmount: <amount>,
        currencyCode: <currency-code>
      }
    }
  ]
}

```

Important: The amount to capture has to be the full amount.

##### Refund Payment

- centAmount: Amount in the smallest indivisible unit of a currency. For example, 5 EUR is specified as 500 while 5 JPY is specified as 5.
- currencyCode: Currency code compliant to [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217).

```
{
  actions: [
    {
      action: "refundPayment",
      amount: {
        centAmount: <amount>,
        currencyCode: <currency-code>
      }
    }
  ]
}

Important: The refund can be done for partial or total amount.

```

#### Response Parameters

```
{
  outcome: "approved|rejected|received"
}

```
