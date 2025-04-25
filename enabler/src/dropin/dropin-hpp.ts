import {
  DropinComponent,
  DropinOptions,
  PaymentDropinBuilder,
} from "../payment-enabler/payment-enabler";
import styles from "../style/style.module.scss";
import buttonStyles from "../style/button.module.scss";
import { BaseOptions } from "../payment-enabler/payment-enabler-monext";

export class DropinHppBuilder implements PaymentDropinBuilder {
  public dropinHasSubmit = false;

  constructor(private baseOptions: BaseOptions) {}

  build(config: DropinOptions): DropinComponent {
    const dropin = new DropinComponents({
      dropinOptions: config,
      baseOptions: this.baseOptions,
    });

    return dropin;
  }
}

export class DropinComponents implements DropinComponent {
  private dropinOptions: DropinOptions;
  private baseOptions: BaseOptions;

  constructor(opts: {
    dropinOptions: DropinOptions;
    baseOptions: BaseOptions;
  }) {
    this.baseOptions = opts.baseOptions;
    this.dropinOptions = opts.dropinOptions;
  }

  /**
   * Mounts the drop-in component to the specified selector.
   *
   * @param selector - The selector where the drop-in component will be mounted.
   *
   * The method will add the HTML template to the DOM and trigger the
   * onDropinReady callback when the template is added.
   *
   * If the showPayButton option is set to true, it will also add a click
   * event listener to the button with the id monext-payment-button. When
   * the button is clicked, it will trigger the onPayButtonClick callback
   * and then call the submit method if the callback resolves.
   */
  mount(selector: string) {
    const targetNode = document.querySelector(selector);

    // check if the template was added to the DOM
    const observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (mutation.type === "childList") {
          if (this.dropinOptions.onDropinReady) {
            this.dropinOptions
              .onDropinReady()
              .then(() => {})
              .catch((error) => console.error(error));
          }
          observer.disconnect();
        }
      }
    });

    observer.observe(targetNode, { childList: true });

    targetNode.insertAdjacentHTML("afterbegin", this._getTemplate());

    if (this.dropinOptions.showPayButton) {
      document
        .querySelector("#monext-payment-button")
        .addEventListener("click", (e) => {
          this.dropinOptions
            .onPayButtonClick()
            .then(() => {
              e.preventDefault();
              this.submit();
            })
            .catch((error) => console.log("error", error));
        });
    }
  }

  /**
   * Submits the payment request to the specified processor URL.
   */
  async submit() {
    try {
      const requestData = {
        languageCode: this.baseOptions.locale,
      };
      const response = await fetch(this.baseOptions.processorUrl + "/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": this.baseOptions.sessionId,
        },
        body: JSON.stringify(requestData),
      });
      const data = await response.json();
      if (data.redirectURL) {
        window.location.replace(data.redirectURL);
      } else {
        this.baseOptions.onError("Some error occurred. Please try again.");
      }
    } catch (e) {
      this.baseOptions.onError("Some error occurred. Please try again.");
    }
  }

  /**
   * Generates the template for the drop-in component.
   *
   * @returns The template for the drop-in component.
   */
  private _getTemplate() {
    return this.dropinOptions.showPayButton
      ? `
    <div class="${styles.wrapper}">
      <button class="${buttonStyles.button} ${buttonStyles.fullWidth} ${styles.submitButton}" id="monext-payment-button">Pay with monext</button>
    </div>
    `
      : "";
  }
}
