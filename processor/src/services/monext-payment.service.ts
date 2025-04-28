import { statusHandler, healthCheckCommercetoolsPermissions, Transaction } from '@commercetools/connect-payments-sdk';
import {
  CancelPaymentRequest,
  CapturePaymentRequest,
  ConfigResponse,
  PaymentProviderModificationResponse,
  RefundPaymentRequest,
  StatusResponse,
} from './types/operation.type';

import { SupportedPaymentComponentsSchemaDTO } from '../dtos/operations/payment-componets.dto';
import { PaymentModificationStatus } from '../dtos/operations/payment-intents.dto';
import packageJSON from '../../package.json';

import { AbstractPaymentService } from './abstract-payment.service';
import { getConfig } from '../config/config';
import { appLogger, paymentSDK } from '../payment-sdk';
import {
  CreatePaymentRequest,
  NotificationPaymentRequest,
  ConfirmPaymentRequest,
  MonextPaymentServiceOptions,
  TransactionTypes,
  TransactionStates,
  MonextTransactionTypes,
  MonextTransactionStatus,
} from './types/monext-payment.type';
import { MonextAPI } from '../clients/monext.client';
import { CtpAPI } from '../clients/ctp.client';

import {
  PaymentOutcome,
  PaymentResponseSchemaDTO,
  NotificationResponseSchemaDTO,
  ReturnResponseSchemaDTO,
} from '../dtos/monext-payment.dto';
import {
  getCartIdFromContext,
  getCtSessionIdFromContext,
  getPaymentInterfaceFromContext,
  getProcessorUrlFromContext,
  getMerchantReturnUrlFromContext,
} from '../libs/fastify/context/context';

import { log } from '../libs/logger';
import { sessionPayload } from '../utils/monext-session.utils';
import {
  Labels,
  MonextAssociatedTransactions,
  MonextCaptureType,
  MonextSessionDetails,
  MonextUsedPaymentInstrument,
  SessionResult,
} from '../clients/types/monext.client.type';
import { isValidJSON } from '../utils/global.utils';

export class MonextPaymentService extends AbstractPaymentService {
  private monextClient: MonextAPI;
  private cptClient: CtpAPI;

  /**
   * Constructs a new instance of the MonextPaymentService class.
   *
   * @param {MonextPaymentServiceOptions} opts - The options for the service.
   * @param {CartService} opts.ctCartService - The cart service for the service.
   * @param {PaymentService} opts.ctPaymentService - The payment service for the service.
   */
  constructor(opts: MonextPaymentServiceOptions) {
    super(opts.ctCartService, opts.ctPaymentService);
    this.monextClient = new MonextAPI();
    this.cptClient = new CtpAPI();
  }

  /**
   * Get configurations
   *
   * @remarks
   * Implementation to provide mocking configuration information
   *
   * @returns Promise with mocking object containing configuration information
   */
  public async config(): Promise<ConfigResponse> {
    return {
      environment: getConfig().monextEnvironment,
    };
  }

  /**
   * Get status
   *
   * @remarks
   * Implementation to provide mocking status of external systems
   *
   * @returns Promise with mocking data containing a list of status from different external systems
   */
  public async status(): Promise<StatusResponse> {
    const handler = await statusHandler({
      timeout: getConfig().healthCheckTimeout,
      log: appLogger,
      checks: [
        healthCheckCommercetoolsPermissions({
          requiredPermissions: [
            'manage_payments',
            'view_sessions',
            'view_api_clients',
            'manage_orders',
            'manage_customers',
            'introspect_oauth_tokens',
            'manage_checkout_payment_intents',
          ],
          ctAuthorizationService: paymentSDK.ctAuthorizationService,
          projectKey: getConfig().projectKey,
        }),
        async () => {
          try {
            const healthCheck = await this.monextClient.healthCheck('HOMOLOGATION');
            if (healthCheck?.status === 200) {
              const paymentMethods = Labels.MONEXT;
              return {
                name: 'Monext Payment API',
                status: 'UP',
                message: 'Monext API is working',
                details: {
                  paymentMethods,
                },
              };
            } else {
              throw new Error();
            }
          } catch (e) {
            return {
              name: 'Monext Payment API',
              status: 'DOWN',
              message: 'The Monext payment API is down for some reason. Please check the logs for more details.',
              details: {
                error: e,
              },
            };
          }
        },
      ],
      metadataFn: async () => ({
        name: packageJSON.name,
        description: packageJSON.description,
        '@commercetools/connect-payments-sdk': packageJSON.dependencies['@commercetools/connect-payments-sdk'],
      }),
    })();

    return handler.body;
  }

  /**
   * Get supported payment components
   *
   * @remarks
   * Implementation to provide the mocking payment components supported by the processor.
   *
   * @returns Promise with mocking data containing a list of supported payment components
   */
  public async getSupportedPaymentComponents(): Promise<SupportedPaymentComponentsSchemaDTO> {
    return {
      dropins: [
        {
          type: 'hpp',
        },
      ],
      components: [],
    };
  }

  /**
   * Capture payment
   *
   * @remarks
   * Implementation to provide the mocking data for payment capture in external PSPs
   *
   * @param request - contains the amount and {@link https://docs.commercetools.com/api/projects/payments | Payment } defined in composable commerce
   * @returns Promise with mocking data containing operation status and PSP reference
   */
  public async capturePayment(request: CapturePaymentRequest): Promise<PaymentProviderModificationResponse> {
    // Get the environment
    const environment = await this.getEnvironment('', request.payment.id);
    const sessionDetails = await this.monextClient.getSessionDetails(
      request.payment.interfaceId as string,
      environment,
    );

    // Find the authorization transaction
    const transaction = sessionDetails.transactions?.find(
      (transaction) => transaction.type === MonextTransactionTypes.AUTHORIZATION,
    );

    // return rejected if there is no authorization transaction or if the authorized value and the requestedAmount are not equal
    if (!transaction || transaction.requestedAmount !== request.amount.centAmount) {
      return {
        outcome: PaymentModificationStatus.REJECTED,
        pspReference: request.payment.interfaceId as string,
      };
    }

    const transactionDetails = await this.monextClient.getTransactionDetails(transaction.id as string, environment);

    // return rejected if not transaction details or not associated transactions
    if (!transactionDetails || !transactionDetails.associatedTransactions) {
      return { outcome: PaymentModificationStatus.REJECTED, pspReference: request.payment.interfaceId as string };
    }

    // Verify if capturePayment is a valid transaction
    const isNotValidTransaction = transactionDetails.associatedTransactions.some((transaction) =>
      this.containsSuccessTransactionFromList(transaction, [
        MonextTransactionTypes.CANCEL,
        MonextTransactionTypes.RESET,
        MonextTransactionTypes.CAPTURE,
        MonextTransactionTypes.AUTHORIZATION_AND_CAPTURE,
      ]),
    );

    // return rejected if transaction is not valid
    if (isNotValidTransaction) {
      return {
        outcome: PaymentModificationStatus.REJECTED,
        pspReference: request.payment.interfaceId as string,
      };
    }

    // Capture transaction
    const monextCaptureResponse = await this.monextClient.captureTransaction(
      transaction.id as string,
      {
        amount: transaction.requestedAmount as number,
      },
      environment,
    );

    return {
      outcome:
        monextCaptureResponse.result.title === SessionResult.ACCEPTED
          ? PaymentModificationStatus.APPROVED
          : PaymentModificationStatus.REJECTED,
      pspReference: monextCaptureResponse.transaction.id as string,
    };
  }

  /**
   * Cancel payment
   *
   * @remarks
   * Implementation to provide the mocking data for payment cancel in external PSPs
   *
   * @param request - contains {@link https://docs.commercetools.com/api/projects/payments | Payment } defined in composable commerce
   * @returns Promise with mocking data containing operation status and PSP reference
   */
  public async cancelPayment(request: CancelPaymentRequest): Promise<PaymentProviderModificationResponse> {
    // Get the environment
    const environment = await this.getEnvironment('', request.payment.id);
    const sessionDetails = await this.monextClient.getSessionDetails(
      request.payment.interfaceId as string,
      environment,
    );

    // Find the authorization transaction
    const transaction = sessionDetails.transactions?.find(
      (transaction) => transaction.type === MonextTransactionTypes.AUTHORIZATION,
    );

    // return rejected if there is no authorization transaction
    if (!transaction) {
      return {
        outcome: PaymentModificationStatus.REJECTED,
        pspReference: request.payment.interfaceId as string,
      };
    }
    const transactionDetails = await this.monextClient.getTransactionDetails(transaction.id as string, environment);

    // return rejected if not transaction details or not associated transactions
    if (!transactionDetails || !transactionDetails.associatedTransactions) {
      return { outcome: PaymentModificationStatus.REJECTED, pspReference: request.payment.interfaceId as string };
    }

    // Verify if cancelPayment is a valid transaction
    const isNotValidTransaction = transactionDetails.associatedTransactions.some((transaction) =>
      this.containsSuccessTransactionFromList(transaction, [
        MonextTransactionTypes.CANCEL,
        MonextTransactionTypes.RESET,
        MonextTransactionTypes.CAPTURE,
        MonextTransactionTypes.AUTHORIZATION_AND_CAPTURE,
      ]),
    );

    // return rejected if transaction is not valid
    if (isNotValidTransaction) {
      return { outcome: PaymentModificationStatus.REJECTED, pspReference: request.payment.interfaceId as string };
    }

    // Cancel transaction
    const monextCancelResponse = await this.monextClient.cancelTransaction(
      transaction.id as string,
      {
        amount: transaction.requestedAmount as number,
      },
      environment,
    );

    return {
      outcome:
        monextCancelResponse.result.title === SessionResult.ACCEPTED
          ? PaymentModificationStatus.APPROVED
          : PaymentModificationStatus.REJECTED,
      pspReference: monextCancelResponse.transaction.id as string,
    };
  }

  /**
   * Refund payment
   *
   * @remarks
   * Implementation to provide the mocking data for payment refund in external PSPs
   *
   * @param request - contains amount and {@link https://docs.commercetools.com/api/projects/payments | Payment } defined in composable commerce
   * @returns Promise with mocking data containing operation status and PSP reference
   */
  public async refundPayment(request: RefundPaymentRequest): Promise<PaymentProviderModificationResponse> {
    // Get the environment
    const environment = await this.getEnvironment('', request.payment.id);

    const sessionDetails = await this.monextClient.getSessionDetails(
      request.payment.interfaceId as string,
      environment,
    );

    // return rejected if there is no authorization transaction
    if (!sessionDetails.transactions) {
      return {
        outcome: PaymentModificationStatus.REJECTED,
        pspReference: request.payment.interfaceId as string,
      };
    }

    // Find the authorization transaction
    const transactionDetails = await this.monextClient.getTransactionDetails(
      sessionDetails.transactions[0].id as string,
      environment,
    );

    // Return rejected if not transaction details or not associated transactions
    if (!transactionDetails || !transactionDetails.associatedTransactions) {
      return { outcome: PaymentModificationStatus.REJECTED, pspReference: request.payment.interfaceId as string };
    }

    // Get the capture transaction
    const captureTransaction = transactionDetails.associatedTransactions.find(
      (transaction) =>
        transaction.type === MonextTransactionTypes.CAPTURE ||
        transaction.type === MonextTransactionTypes.AUTHORIZATION_AND_CAPTURE,
    );

    // return rejected if not capture transaction
    if (!captureTransaction) {
      return {
        outcome: PaymentModificationStatus.REJECTED,
        pspReference: request.payment.interfaceId as string,
      };
    }

    // Verify if refundPayment is a valid transaction
    const isNotValidTransaction = transactionDetails.associatedTransactions.some((transaction) =>
      this.containsSuccessTransactionFromList(transaction, [
        MonextTransactionTypes.CANCEL,
        MonextTransactionTypes.RESET,
      ]),
    );

    const refundedAmount = transactionDetails.associatedTransactions
      .filter((transaction) => transaction.type === 'REFUND' && transaction.status === 'OK')
      .reduce((sum, transaction) => sum + (transaction.amount ? transaction.amount : 0), 0);

    const isFullAmoundRefunded = captureTransaction.amount === refundedAmount;

    // return rejected if transaction is not valid or full amount is refunded
    if (isNotValidTransaction || isFullAmoundRefunded) {
      return {
        outcome: PaymentModificationStatus.REJECTED,
        pspReference: request.payment.interfaceId as string,
      };
    }

    // Refund transaction

    const monextRefundResponse = await this.monextClient.refundTransaction(
      captureTransaction?.originTransactionId as string,
      {
        amount: request.amount.centAmount,
      },
      environment,
    );
    return {
      outcome:
        monextRefundResponse.result.title === SessionResult.ACCEPTED
          ? PaymentModificationStatus.APPROVED
          : PaymentModificationStatus.REJECTED,
      pspReference: monextRefundResponse.transaction.id as string,
    };
  }

  /**
   * Create payment
   *
   * @remarks
   * Implementation to provide the data for payment creation in the Monext API
   *
   * @param request - contains paymentType defined in composable commerce
   * @returns Promise with mocking data containing operation status and PSP reference
   */
  public async createPayment(request: CreatePaymentRequest): Promise<PaymentResponseSchemaDTO> {
    // Get Commercetools Cart
    const ctCart = await this.ctCartService.getCart({
      id: getCartIdFromContext(),
    });

    // Get commercetools cart session Id from context
    const ctsid = getCtSessionIdFromContext();

    // Get the processor URL from context
    const processorURL = getProcessorUrlFromContext();

    // Get Commercetools customer info if exist
    let customer;
    try {
      customer = await this.cptClient.getCustomerById(ctCart.customerId as string);
    } catch (e) {
      customer = undefined;
    }

    // Get the planned amount
    const amountPlanned = await this.ctCartService.getPaymentAmount({
      cart: ctCart,
    });

    // Create Commercetools payment
    const ctPayment = await this.ctPaymentService.createPayment({
      amountPlanned,
      paymentMethodInfo: {
        paymentInterface: getPaymentInterfaceFromContext() || Labels.MONEXT,
      },
      ...(ctCart.customerId && {
        customer: {
          typeId: 'customer',
          id: ctCart.customerId,
        },
      }),
      ...(!ctCart.customerId &&
        ctCart.anonymousId && {
        anonymousId: ctCart.anonymousId,
      }),
    });

    // Add payment to cart
    await this.ctCartService.addPayment({
      resource: {
        id: ctCart.id,
        version: ctCart.version,
      },
      paymentId: ctPayment.id,
    });

    // Create Monext session payload
    const monextSessionPayload = sessionPayload(
      ctPayment,
      ctCart,
      customer && customer.body,
      ctsid,
      processorURL,
      request.data.languageCode,
    );

    try {
      // Get the environment
      const environment = await this.getEnvironment(ctCart.store?.key);
      // Create Monext session
      const monextSessionResponse = await this.monextClient.createSession(monextSessionPayload, environment);

      // Update payment with Monext session
      await this.ctPaymentService.updatePayment({
        id: ctPayment.id,
        pspReference: monextSessionResponse.sessionId,
        transaction: {
          type:
            monextSessionPayload?.payment?.capture === MonextCaptureType.AUTOMATIC
              ? TransactionTypes.CHARGE
              : TransactionTypes.AUTHORIZATION,
          amount: ctPayment.amountPlanned,
          interactionId: monextSessionResponse.sessionId,
          state: TransactionStates.INITIAL,
        },
      });
      return { redirectURL: monextSessionResponse.redirectURL };
    } catch (e) {
      await this.ctPaymentService.updatePayment({
        id: ctPayment.id,
        paymentMethod: Labels.MONEXT,
        transaction: {
          type: TransactionTypes.AUTHORIZATION,
          amount: ctPayment.amountPlanned,
          state: TransactionStates.FAILURE,
        },
      });

      return {
        redirectURL: this.buildRedirectMerchantUrl(ctPayment.id),
      };
    }
  }

  /**
   * Confirms a payment by updating the payment status in the Commercetools and Monext APIs.
   *
   * @param {ConfirmPaymentRequest} request - The request object containing the the Commercetools payment reference and the Monext session token.
   * @return {Promise<ReturnResponseSchemaDTO>} - A promise that resolves to the updated Commercetools payment reference and merchant return URL.
   */
  public async confirmPayment(request: ConfirmPaymentRequest): Promise<ReturnResponseSchemaDTO> {
    // Get the environment
    const environment = await this.getEnvironment('', request.paymentReference);

    const ctPayment = await this.ctPaymentService.getPayment({
      id: request.paymentReference,
    });
    // End if payment is already notified
    if (ctPayment.transactions[0].state !== TransactionStates.INITIAL) {
      return {
        paymentReference: ctPayment.id,
        returnUrl: this.buildRedirectMerchantUrl(ctPayment.id),
      };
    }

    const monextSessionDetails = await this.monextClient.getSessionDetails(request.paylinetoken, environment);
    const cancelledByUser = monextSessionDetails.title === 'CANCELLED';
    //Payment cancelled by user
    if (monextSessionDetails.title && monextSessionDetails.title !== 'ACCEPTED') {
      await this.ctPaymentService.updatePayment({
        id: ctPayment.id,
        pspReference: request.paylinetoken,
        paymentMethod: Labels.MONEXT,
        transaction: {
          type: ctPayment.transactions[0].type,
          amount: ctPayment.amountPlanned,
          interactionId: request.paylinetoken,
          state: TransactionStates.FAILURE,
        },
      });
    } else {
      // Payment successful or failed
      await this.ctPaymentService.updatePayment({
        id: ctPayment.id,
        pspReference: request.paylinetoken,
        paymentMethod: this.returnPaymentMethod(monextSessionDetails),
        transaction: {
          type:
            monextSessionDetails.transactions &&
              monextSessionDetails.transactions[0].type === MonextTransactionTypes.AUTHORIZATION
              ? TransactionTypes.AUTHORIZATION
              : TransactionTypes.CHARGE,
          amount: ctPayment.amountPlanned,
          interactionId: request.paylinetoken,
          state:
            monextSessionDetails.result && monextSessionDetails.result.title === SessionResult.ACCEPTED
              ? TransactionStates.SUCCESS
              : TransactionStates.FAILURE,
        },
      });
    }
    return {
      paymentReference: ctPayment.id,
      returnUrl: this.buildRedirectMerchantUrl(ctPayment.id, cancelledByUser),
    };
  }

  /**
   * Notifies the payment to the processor when the confirmPayment method is not called
   *
   * @param {NotificationPaymentRequest} request - The notification payment request.
   * @return {Promise<NotificationResponseSchemaDTO>} - The notification response schema.
   */
  public async notifyPayment(request: NotificationPaymentRequest): Promise<NotificationResponseSchemaDTO> {
    // Get the environment
    const environment = await this.getEnvironment('', request.paymentId);

    const ctPayment = await this.ctPaymentService.getPayment({
      id: request.paymentId,
    });

    // End if payment is already confirmed
    if (ctPayment.transactions[0].state !== TransactionStates.INITIAL) {
      return {
        status: 'Already confirmed',
        type: ctPayment.transactions[0].type,
      };
    }

    // Update payment with Monext session
    const monextSessionDetails = await this.monextClient.getSessionDetails(request.token, environment);
    if (monextSessionDetails.title && monextSessionDetails.title !== 'ACCEPTED') {
      await this.ctPaymentService.updatePayment({
        id: ctPayment.id,
        pspReference: request.token,
        paymentMethod: this.returnPaymentMethod(monextSessionDetails),
        transaction: {
          type: ctPayment.transactions[0].type,
          amount: ctPayment.amountPlanned,
          interactionId: request.token,
          state: TransactionStates.FAILURE,
        },
      });
      return {
        status: monextSessionDetails.title,
        type: ctPayment.transactions[0].type,
      };
    } else {
      await this.ctPaymentService.updatePayment({
        id: ctPayment.id,
        pspReference: request.token,
        paymentMethod: this.returnPaymentMethod(monextSessionDetails),
        transaction: {
          type:
            monextSessionDetails.transactions &&
              monextSessionDetails.transactions[0].type === MonextTransactionTypes.AUTHORIZATION
              ? TransactionTypes.AUTHORIZATION
              : TransactionTypes.CHARGE,
          amount: ctPayment.amountPlanned,
          interactionId: request.token,
          state:
            monextSessionDetails.result?.title === SessionResult.ACCEPTED
              ? TransactionStates.SUCCESS
              : TransactionStates.FAILURE,
        },
      });
      return {
        status: monextSessionDetails.result?.title || (monextSessionDetails.title as string),
        type:
          monextSessionDetails.transactions &&
            monextSessionDetails.transactions[0].type === MonextTransactionTypes.AUTHORIZATION
            ? TransactionTypes.AUTHORIZATION
            : TransactionTypes.CHARGE,
      };
    }
  }

  /**
   * Builds a redirect URL for the merchant with the provided payment reference.
   *
   * @param {string} paymentReference - The payment reference to include in the redirect URL.
   * @return {string} The constructed redirect URL.
   */
  private buildRedirectMerchantUrl(paymentReference: string, cancelledByUser: boolean = false): string {
    // Get the merchan return URL from context
    const merchantReturnUrl = getMerchantReturnUrlFromContext();
    const redirectUrl = new URL(merchantReturnUrl || getConfig().returnUrl);
    redirectUrl.searchParams.append('paymentReference', paymentReference);
    if (cancelledByUser) {
      redirectUrl.searchParams.append('userAction', 'cancelled');
    }
    return redirectUrl.toString();
  }

  /**
   * Retrieves the environment information based on the provided store key and/or payment ID.
   *
   * @param {string} storeKey - The key of the store.
   * @param {string} paymentId - The ID of the payment.
   * @returns {Promise<string>} The environment information retrieved.
   */
  private async getEnvironment(storeKey: string = '', paymentId: string = ''): Promise<string> {
    const env = getConfig().monextEnvironment;

    if (!storeKey && !paymentId) {
      if (isValidJSON(env)) {
        const key = Object.keys(JSON.parse(env))[0];
        return JSON.parse(env)[key];
      }
      return getConfig().monextEnvironment;
    }

    if (!storeKey) {
      const ctCart = await this.cptClient.getCartByPaymentId(paymentId);
      storeKey = ctCart.body.results[0].store?.key || '';
    }

    const environment = isValidJSON(env) ? storeKey && JSON.parse(env)[storeKey] : env;

    return environment || '';
  }

  /**
   * Checks if a transaction is successful and matches one of the specified transaction types.
   *
   * @param {MonextAssociatedTransactions} transaction - The Monext transaction to check.
   * @param {string[]} transactionTypes - The types of transactions to match against.
   * @return {boolean} True if the transaction is successful and matches one of the specified types, false otherwise.
   */
  private containsSuccessTransactionFromList(
    transaction: MonextAssociatedTransactions,
    transactionTypes: string[],
  ): boolean {
    return transactionTypes.includes(transaction.type as string) && transaction.status === MonextTransactionStatus.OK;
  }

  /**
   * Returns the payment method based on the Monext session details.
   *
   * @param {MonextSessionDetails} monextSessionDetails - The details of the Monext session.
   * @return {string} The payment method.
   */
  private returnPaymentMethod(monextSessionDetails: MonextSessionDetails): string {
    if (!monextSessionDetails.transactions) return Labels.MONEXT;
    if (
      monextSessionDetails.transactions[0].paymentInstrumentData?.usedPaymentInstrument ===
      MonextUsedPaymentInstrument.CARD
    )
      return Labels.CREDITCARD;
    return monextSessionDetails.transactions[0].paymentInstrumentData?.paymentInstrumentType.code as string;
  }

  private convertPaymentResultCode(resultCode: PaymentOutcome): string {
    switch (resultCode) {
      case PaymentOutcome.AUTHORIZED:
        return 'Success';
      case PaymentOutcome.REJECTED:
        return 'Failure';
      default:
        return 'Initial';
    }
  }
}
