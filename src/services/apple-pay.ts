import Service from './-utils/service';
import { tracked } from '@glimmer/component';
import loadScript from './-utils/load-script';

export default class ApplePay extends Service {

  @tracked isAvailable = self.location.protocol === 'https:' && self.ApplePaySession && self.ApplePaySession.canMakePayments();

  constructor(options) {
    super(options);
    loadScript('https://js.stripe.com/v2/').then(() => {
      console.log('eagerly loaded');
      if (!self.Stripe.applePay) {
        this.revokeAvailability();
        throw new Error('Sorry, ApplePay is not supported on this device');
      }
    });
  }

  revokeAvailability() {
    this.isAvailable = false;
    this.notify();
  }

  charge(paymentRequest) {
   return new Promise((resolve, reject) => {
      self.Stripe.applePay.checkAvailability((result) => {
        if (!result) {
          debugger;
          this.revokeAvailability();
          reject(new Error('Sorry, ApplePay is not available on this device'));
        }
        resolve();
      });
    }).then(() => {
      return new Promise((resolve, reject) => {
        self.Stripe.applePay.buildSession(
          paymentRequest,
          buildSuccessHandler(resolve),
          reject
        ).begin();
      });
    }).catch(e => {
      self.alert(`There was an error in the checkout process: ${e.message}`);
      throw e;
    });
  }
}

function buildSuccessHandler(resolve) {
  return function successHandlerResolution(result, completion) {
    resolve({
      result,

      notify: {
        success() {
          completion(self.ApplePaySession.STATUS_SUCCESS);
        },

        failure() {
          completion(self.ApplePaySession.STATUS_FAILURE);
        }
      }
    });
  }
}
