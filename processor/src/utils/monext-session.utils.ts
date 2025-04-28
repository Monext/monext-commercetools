import { Labels, MonextItem, MonextPaymentType, MonextSession } from '../clients/types/monext.client.type';
import { config } from '../config/config';
import { Payment, Cart, LineItem, CustomLineItem, Customer } from '@commercetools/platform-sdk';
import { isValidJSON } from './global.utils';
import { paymentSDK } from '../payment-sdk';

/**
 * Maps line items to Monext items with specific properties.
 *
 * @param {LineItem[]} lineItems - The line items to be transformed.
 * @return {MonextItem[]} The transformed Monext items.
 */
const lineItemsToItems = (cart: Cart): MonextItem[] => {
  const monextItems: MonextItem[] = [];

  cart.lineItems.forEach((item: LineItem) => monextItems.push({
    reference: item.variant.sku,
    price: item.totalPrice.centAmount,
    quantity: item.quantity,
    ...(item.taxRate && { taxRate: Math.floor(item.taxRate.amount * 10000) }),
  }))

  cart.customLineItems.forEach((item: CustomLineItem) => monextItems.push({
    reference: item.key,
    price: item.totalPrice.centAmount,
    quantity: item.quantity,
    ...(item.taxRate && { taxRate: Math.floor(item.taxRate.amount * 10000) }),
  }))

  return monextItems;
};

/**
 * Validates whether a given string is a correctly formatted email address.
 *
 * @param {string} [email] - The email address to validate.
 * @return {boolean} Returns true if the email is valid, otherwise false.
 */

const isValidEmail = (email?: string): boolean => {
  if (!email) {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Verifies whether a given string is not longer than a given length.
 *
 * @param {number} length - The maximum allowed length of the string.
 * @param {string} [str] - The string to verify.
 * @return {boolean} Returns true if the string is not longer than the given length, otherwise false.
 */
const verifyLength = (length: number, str?: string): boolean => {
  if (!str) {
    return false;
  }
  return str.length <= length;
};

/**
 * Sanitizes a given language code to a valid ISO 639-1 language code.
 * If the given language code is null or empty, it will return the default language code which is 'en'.
 *
 * @param {string} [languageCode] - The language code to sanitize.
 * @return {string} A valid ISO 639-1 language code.
 */
const sanitizeLanguageCode = (languageCode?: string): string => {
  if (!languageCode) {
    return Labels.EN_LANG;
  }
  return languageCode.slice(0, 2).toUpperCase();
};

/**
 * Generates a Monext session payload based on the provided payment, cart, and customer information.
 *
 * @param {Payment} payment - The payment information.
 * @param {Cart} cart - The cart information.
 * @param {Customer} customer - The customer information.
 * @param {string} [ctsid] - The Commercetools session ID.
 * @param {string} [processorURL] - The Commercetools processor URL.
 * @return {MonextSession} The generated Monext session payload.
 */
export const sessionPayload = (
  payment: Payment,
  cart: Cart,
  customer?: Customer,
  ctsid?: string,
  processorURL?: string,
  languageCode?: string,
): MonextSession => {
  const items = lineItemsToItems(cart);
  const pointOfSale = isValidJSON(config.monextPointOfSaleRef)
    ? cart.store && JSON.parse(config.monextPointOfSaleRef)[cart.store.key]
    : config.monextPointOfSaleRef;
  const captureMethod = isValidJSON(config.monextCaptureType)
    ? cart.store && JSON.parse(config.monextCaptureType)[cart.store.key]
    : config.monextCaptureType;
  const shippingAddress = paymentSDK.ctCartService.getOneShippingAddress({ cart });
  const normalizedShipping = paymentSDK.ctCartService.getNormalizedShipping({ cart });
  const shippingCharge = normalizedShipping.reduce((acc, value) => value.shippingInfo.price.centAmount + acc, 0);
  const shippingMethodName = normalizedShipping.map((value) => value.shippingInfo.shippingMethodName).join(" - ");

  const payload = {
    pointOfSaleReference: pointOfSale,
    returnURL: `${processorURL}/return?paymentReference=${payment.id}&ctsid=${ctsid}`,
    notificationURL: `${processorURL}/notification/${payment.id}?ctsid=${ctsid}`,
    languageCode: sanitizeLanguageCode(languageCode),
    order: {
      reference: cart.id,
      amount: payment.amountPlanned.centAmount,
      ...(cart.discountOnTotalPrice && { discount: cart.discountOnTotalPrice.discountedAmount }),
      currency: cart.totalPrice.currencyCode,
      origin: 'E_COM',
      country: cart.billingAddress?.country || cart.shippingAddress?.country || cart.country,
      items,
    },
    payment: {
      paymentType: MonextPaymentType.ONE_OFF,
      capture: captureMethod,
      amount: payment.amountPlanned.centAmount,
    },
    buyer: {
      id: customer?.id || '',
      firstName: customer?.firstName || '',
      lastName: customer?.lastName || '',
      email: customer?.email || cart.customerEmail,
      birthDate: customer?.dateOfBirth || '',
      legalStatus: 'PRIVATE',
      ...(cart.billingAddress && {
        billingAddress: {
          firstName: cart.billingAddress.firstName,
          lastName: cart.billingAddress.lastName,
          ...(isValidEmail(cart.billingAddress.email) && {
            email: cart.billingAddress.email,
          }),
          ...(verifyLength(15, cart.billingAddress.mobile) && {
            mobile: cart.billingAddress.mobile,
          }),
          streetNumber: cart.billingAddress.streetNumber,
          street: cart.billingAddress.streetName,
          complement: cart.billingAddress.additionalStreetInfo,
          city: cart.billingAddress.city,
          zip: cart.billingAddress.postalCode,
          country: cart.billingAddress.country,
        },
      }),
    },
    delivery: {
      ...(normalizedShipping.length > 0 && {
        charge: shippingCharge,
        provider: shippingMethodName,
      }),
      ...(shippingAddress && {
        address: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          ...(isValidEmail(shippingAddress.email) && {
            email: shippingAddress.email,
          }),
          ...(verifyLength(15, shippingAddress.mobile) && {
            mobile: shippingAddress.mobile,
          }),
          streetNumber: shippingAddress.streetNumber,
          street: shippingAddress.streetName,
          complement: shippingAddress.additionalStreetInfo,
          city: shippingAddress.city,
          zip: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
      }),
    },
    privateData: {
      commercetoolsPaymentID: payment.id,
    },
  };
  return payload as MonextSession;
};
