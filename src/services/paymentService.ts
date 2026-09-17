/**
 * Payment Service - Razorpay Standard Checkout & Demo Mode Orchestrator
 *
 * Enforces server-authoritative payment flow:
 * 1. POST /api/payment/create-order (receives verified orderId + calculated amount)
 * 2. Razorpay Standard Checkout modal or clean simulated demo checkout
 * 3. POST /api/payment/verify-payment (cryptographic signature check)
 * 4. Syncs with Firestore paymentOrders and updates booking state
 */

import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PaymentOrder, PaymentOrderStatus, PriestRequest } from '../types';

export interface CreateOrderResult {
  orderId: string;
  amount: number; // in paise
  currency: string;
  keyId: string;
  isDemoMode: boolean;
  totalAmount: number; // in INR
  servicePrice: number;
  platformFee: number;
  rewardDiscount: number;
}

export interface VerifyPaymentResult {
  verified: boolean;
  alreadyCaptured?: boolean;
  orderId: string;
  paymentId: string;
  totalAmount: number;
  platformCommission?: number;
  priestPayableAmount?: number;
  escrowStatus?: string;
  isDemoMode: boolean;
}

// Dynamically load Razorpay standard checkout script if not present
export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('[PaymentService] Razorpay checkout script failed to load from CDN. Will fall back gracefully.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

class PaymentService {
  /**
   * Request the server to calculate payable amount and create an authoritative gateway order
   */
  async createPaymentOrder(params: {
    request: PriestRequest;
    rewardDiscount?: number;
  }): Promise<CreateOrderResult> {
    const { request, rewardDiscount = 0 } = params;

    const res = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: request.id,
        customerId: request.customerId,
        priestId: request.priestId,
        servicePrice: request.servicePrice,
        rewardDiscount,
        requestStatus: request.status
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Order creation failed' }));
      throw new Error(err.error || 'Failed to create payment order.');
    }

    const orderData: CreateOrderResult = await res.json();

    // Mirror order in Firestore paymentOrders collection
    try {
      const orderRef = doc(db, 'paymentOrders', orderData.orderId);
      const newOrderDoc: Partial<PaymentOrder> = {
        id: orderData.orderId,
        orderId: orderData.orderId,
        requestId: request.id,
        customerId: request.customerId,
        customerName: request.customerName,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        priestId: request.priestId,
        priestName: request.priestName,
        currency: 'INR',
        servicePrice: orderData.servicePrice,
        platformFee: orderData.platformFee,
        rewardDiscount: orderData.rewardDiscount,
        totalAmount: orderData.totalAmount,
        amountInPaise: orderData.amount,
        status: 'CREATED',
        isDemoMode: orderData.isDemoMode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      };
      await setDoc(orderRef, newOrderDoc, { merge: true });
    } catch {
      // Non-blocking Firestore save
    }

    // Update request state in Firestore to PAYMENT_PENDING
    try {
      const reqRef = doc(db, 'requests', request.id);
      await updateDoc(reqRef, {
        status: 'PAYMENT_PENDING',
        activeOrderId: orderData.orderId,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Non-blocking Firestore save
    }

    return orderData;
  }

  /**
   * Launch Razorpay Standard Checkout modal or perform simulated demo payment
   */
  async openCheckout(params: {
    orderData: CreateOrderResult;
    request: PriestRequest;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
    onSuccess: (response: { orderId: string; paymentId: string; signature: string }) => void;
    onDismiss?: () => void;
    onError?: (err: Error) => void;
  }): Promise<void> {
    const { orderData, request, customerEmail, customerPhone, customerName, onSuccess, onDismiss, onError } = params;

    // DEMO MODE CHECKOUT
    if (orderData.isDemoMode) {
      // Simulate realistic payment delay for demo
      setTimeout(() => {
        const demoPaymentId = `pay_DEMO_${Date.now().toString(16)}_${Math.random().toString(36).substring(2, 7)}`;
        const demoSignature = `demo_sig_${Date.now().toString(16)}_${Math.random().toString(36).substring(2, 10)}`;
        onSuccess({
          orderId: orderData.orderId,
          paymentId: demoPaymentId,
          signature: demoSignature
        });
      }, 1200);
      return;
    }

    // PRODUCTION / SANDBOX RAZORPAY STANDARD CHECKOUT
    const hasScript = await loadRazorpayScript();
    if (!hasScript || !(window as any).Razorpay) {
      onError?.(new Error('Razorpay checkout SDK is not accessible. Please check your internet connection or try again.'));
      return;
    }

    const options = {
      key: (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Purohit Seva',
      description: `Dakshina for ${request.eventName || 'Vedic Ceremony'}`,
      image: 'https://images.unsplash.com/photo-1609358905581-e5382c448839?w=150',
      order_id: orderData.orderId,
      prefill: {
        name: customerName || request.customerName,
        email: customerEmail || request.customerEmail,
        contact: customerPhone || request.customerPhone
      },
      theme: {
        color: '#D97706' // Warm spiritual Amber-600
      },
      modal: {
        ondismiss: () => {
          onDismiss?.();
        }
      },
      handler: (response: any) => {
        onSuccess({
          orderId: response.razorpay_order_id || orderData.orderId,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature
        });
      }
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        const desc = resp.error?.description || 'Payment was unsuccessful.';
        onError?.(new Error(desc));
      });
      rzp.open();
    } catch (err: any) {
      onError?.(err instanceof Error ? err : new Error('Failed to open Razorpay modal.'));
    }
  }

  /**
   * Authoritatively verify payment on the server
   */
  async verifyPayment(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    requestId: string;
    customerId: string;
  }): Promise<VerifyPaymentResult> {
    const res = await fetch('/api/payment/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Payment verification failed' }));
      throw new Error(err.error || 'Payment verification failed.');
    }

    const result: VerifyPaymentResult = await res.json();

    // Mirror verified order in Firestore
    try {
      const orderRef = doc(db, 'paymentOrders', params.orderId);
      await updateDoc(orderRef, {
        status: 'PAID' as PaymentOrderStatus,
        paymentId: params.paymentId,
        paymentSignature: params.signature,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Non-blocking Firestore save
    }

    return result;
  }

  /**
   * Request an admin-authorized refund for a ceremony payment
   */
  async requestRefund(params: {
    bookingId: string;
    orderId?: string;
    paymentId: string;
    amount: number;
    reason?: string;
    userRole: string;
  }): Promise<{ success: boolean; refundId: string; amount: number }> {
    const res = await fetch('/api/payment/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Refund failed' }));
      throw new Error(err.error || 'Failed to process refund.');
    }

    return res.json();
  }
}

export const paymentService = new PaymentService();
