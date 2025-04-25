import { config } from '../config/config';
import { log } from '../libs/logger';
import {
  MonextSession,
  MonextSessionResponse,
  MonextSessionDetails,
  MonextRefundTransaction,
  MonextCaptureTransaction,
  MonextTransactionResponse,
  MonextTransactionDetails,
  MonextBasePath,
  MonextUrls,
  originVersion,
} from './types/monext.client.type';

export class MonextAPI {
  public async healthCheck(environment: string) {
    const url = this.buildResourceUrl(environment, MonextUrls.HEALTH_CHECK);
    const options = {
      method: 'GET',
      headers: {
        accept: '*/*',
        authorization: `Basic ${config.monextApiKey}`,
        'version': originVersion
      },
    };
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const error = await res.json();
        throw error;
      }
      const data = await res.text();
      return {
        status: res.status,
        statusText: data,
      };
    } catch (err) {
      log.error('Error checking API status: ', err);
      throw err;
    }
  }
  /**
   * Creates a session using the provided payload.
   *
   * @remarks
   * See: https://api-docs.retail.monext.com/reference/sessioncreate
   *
   * @param {MonextSession} payload - The payload for creating the session.
   * @return {Promise<MonextSessionResponse>} A promise that resolves to the session response or any error that occurred.
   */
  public async createSession(payload: MonextSession, environment: string): Promise<MonextSessionResponse> {
    const url = this.buildResourceUrl(environment, MonextUrls.CREATE_SESSION);
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${config.monextApiKey}`,
        'version': originVersion
      },
      body: JSON.stringify(payload),
    };
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const error = await res.json();
        throw error;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      log.error('Error creating Monext session: ', err);
      throw err;
    }
  }

  /**
   * Retrieves the details of a session using the provided session ID.
   *
   * @remarks
   * See: https://api-docs.retail.monext.com/reference/sessionget
   *
   * @param {string} sessionId - The ID of the session to retrieve details for.
   * @return {Promise<MonextSessionDetails>} A promise that resolves to the session details or any error that occurred.
   */
  public async getSessionDetails(sessionId: string, environment: string): Promise<MonextSessionDetails> {
    const url = this.buildResourceUrl(environment, MonextUrls.GET_SESSION_DETAILS, sessionId);
    const options = {
      method: 'GET',
      headers: {
        accept: '*/*',
        authorization: `Basic ${config.monextApiKey}`,
        'version': originVersion
      },
    };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const error = await res.json();
        return error;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      return {
        title: 'ERROR',
        detail: 'Error while getting session details',
      };
    }
  }

  public async getTransactionDetails(transactionId: string, environment: string): Promise<MonextTransactionDetails> {
    const url = this.buildResourceUrl(environment, MonextUrls.GET_TRANSACTION_DETAILS, transactionId);
    const options = {
      method: 'GET',
      headers: {
        accept: '*/*',
        authorization: `Basic ${config.monextApiKey}`,
        'version': originVersion
      },
    };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const error = await res.json();
        return error;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      return {
        title: 'ERROR',
        detail: 'Error while getting transaction details',
      };
    }
  }

  /**
   * Refunds a transaction using the provided transaction ID and payload.
   *
   * @param {string} transactionId - The ID of the transaction to refund.
   * @param {MonextRefundTransaction} payload - The payload for the refund transaction.
   * @return {Promise<MonextTransactionResponse | any>} A promise that resolves to the session details or any error that occurred.
   */
  public async refundTransaction(
    transactionId: string,
    payload: MonextRefundTransaction,
    environment: string,
  ): Promise<MonextTransactionResponse | any> {
    const url = this.buildResourceUrl(environment, MonextUrls.REFUND, transactionId);
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${config.monextApiKey}`,
        'version': originVersion
      },
      body: JSON.stringify(payload),
    };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const error = await res.json();
        throw error;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      log.error('Error refunding transaction: ', err);
      throw err;
    }
  }

  /**
   * Captures a transaction using the provided transaction ID and payload.
   *
   * @param {string} transactionId - The ID of the transaction to capture.
   * @param {MonextCaptureTransaction} payload - The payload for the capture transaction.
   * @return {Promise<MonextTransactionResponse>} A promise that resolves to the session details or any error that occurred.
   */
  public async captureTransaction(
    transactionId: string,
    payload: MonextCaptureTransaction,
    environment: string,
  ): Promise<MonextTransactionResponse> {
    const url = this.buildResourceUrl(environment, MonextUrls.CAPTURE, transactionId);
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${config.monextApiKey}`,
        'version': originVersion
      },
      body: JSON.stringify(payload),
    };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const error = await res.json();
        throw error;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      log.error('Error capturing transaction: ', err);
      throw err;
    }
  }

  /**
   * Cancels a transaction using the provided transaction ID and payload.
   *
   * @param {string} transactionId - The ID of the transaction to be cancelled.
   * @param {MonextCaptureTransaction} payload - The payload containing the details of the cancellation.
   * @return {Promise<MonextTransactionResponse>} A promise that resolves to the response data if the cancellation is successful, or an error object if the cancellation fails.
   */
  public async cancelTransaction(
    transactionId: string,
    payload: MonextCaptureTransaction,
    environment: string,
  ): Promise<MonextTransactionResponse> {
    const url = this.buildResourceUrl(environment, MonextUrls.CANCEL, transactionId);
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Basic ${config.monextApiKey}`,
        'version': originVersion
      },
      body: JSON.stringify(payload),
    };

    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const error = await res.json();
        throw error;
      }
      const data = await res.json();
      return data;
    } catch (err) {
      log.error('Error canceling transaction: ', err);
      throw err;
    }
  }
  /**
   * Builds a URL based on the provided environment, Monext API baseURL and resource.
   *
   * @param {MonextUrls} resource - The resource to build the URL for.
   * @param {string} [resourceId] - The optional resource ID to include in the URL.
   * @return {string} The built resource URL.
   */
  private buildResourceUrl(environment: string, resource: MonextUrls, resourceId?: string): string {
    let url = `${MonextBasePath.HOMOLOGATION.toString()}${resource}`;
    if (environment.toLowerCase() === 'production') {
      url = `${MonextBasePath.PRODUCTION.toString()}${resource}`;
    }

    if (resourceId) {
      url = url.replace(/{resourceId}/g, resourceId);
    }

    return url;
  }
}
