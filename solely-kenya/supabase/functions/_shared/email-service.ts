/**
 * Email Service for Supabase Edge Functions
 * 
 * Uses Resend API for sending emails.
 * 
 * Setup:
 * 1. Create account at https://resend.com
 * 2. Get API key and add to Supabase secrets:
 *    npx supabase secrets set RESEND_API_KEY=re_xxxxx
 * 3. Verify your domain or use onboarding@resend.dev for testing
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set - email not sent");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: options.from || "Solely Kenya <no-reply@solelyshoes.co.ke>",
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return { success: false, error: data.message || "Failed to send email" };
    }

    console.log("Email sent successfully:", data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Email templates
export const emailTemplates = {
  vendorNewOrder: (data: {
    businessName: string;
    orderId: string;
    items: string;
    total: number;
    deliveryLocation: string;
    customerName: string;
    dashboardUrl: string;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🛒 New Order Received!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.businessName},</p>
          <p>Great news! You have a new order waiting for your confirmation.</p>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
            <p><strong>Total:</strong> KES ${data.total.toLocaleString()}</p>
            <p><strong>Delivery to:</strong> ${data.deliveryLocation}</p>
            <p><strong>Customer:</strong> ${data.customerName}</p>
          </div>
          
          <a href="${data.dashboardUrl}" class="cta-button">View Order & Respond</a>
          
          <div class="warning">
            <strong>⏰ Important:</strong> Please respond within 48 hours or the order will be automatically cancelled and refunded.
          </div>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
          <p>If you have questions, reply to this email or contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  buyerOrderDeclined: (data: {
    customerName: string;
    orderId: string;
    items: string;
    total: number;
    vendorName: string;
    reason?: string;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .refund-notice { background: #d1fae5; border: 1px solid #10b981; padding: 12px; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Order Update</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>We're sorry to inform you that your order could not be fulfilled by the vendor.</p>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
            <p><strong>Amount:</strong> KES ${data.total.toLocaleString()}</p>
            <p><strong>Vendor:</strong> ${data.vendorName}</p>
            ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          </div>
          
          <div class="refund-notice">
            <strong>✅ Refund Initiated:</strong> Your payment of KES ${data.total.toLocaleString()} will be refunded to your original payment method within 3-5 business days.
          </div>
          
          <p style="margin-top: 20px;">We apologize for any inconvenience. Please feel free to explore other products on Solely Kenya!</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
          <p>If you have questions about your refund, please contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  buyerOrderAutoDeclined: (data: {
    customerName: string;
    orderId: string;
    items: string;
    total: number;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .refund-notice { background: #d1fae5; border: 1px solid #10b981; padding: 12px; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Order Automatically Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Unfortunately, the vendor did not respond to your order within 48 hours, so it has been automatically cancelled.</p>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
            <p><strong>Amount:</strong> KES ${data.total.toLocaleString()}</p>
          </div>
          
          <div class="refund-notice">
            <strong>✅ Refund Initiated:</strong> Your payment of KES ${data.total.toLocaleString()} will be refunded to your original payment method within 3-5 business days.
          </div>
          
          <p style="margin-top: 20px;">We apologize for any inconvenience. Please feel free to explore other products on Solely Kenya!</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // NEW: Order Placed Confirmation
  buyerOrderPlaced: (data: {
    customerName: string;
    orderId: string;
    items: string;
    total: number;
    deliveryType: string;
    orderTrackingUrl: string;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .status-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 14px; }
        .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .next-steps { background: #e0f2fe; border: 1px solid #0284c7; padding: 12px; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🎉 Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Thank you for your order! Your payment has been received and your order is now being processed.</p>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
            <p><strong>Total:</strong> KES ${data.total.toLocaleString()}</p>
            <p><strong>Delivery:</strong> ${data.deliveryType}</p>
            <p><span class="status-badge">⏳ Awaiting Vendor Confirmation</span></p>
          </div>
          
          <div class="next-steps">
            <strong>What happens next?</strong>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Vendor reviews and confirms your order (within 24 hours)</li>
              <li>Vendor ships your order and provides tracking</li>
              <li>You receive and confirm delivery</li>
              <li>Payment is released to vendor</li>
            </ol>
          </div>
          
          <a href="${data.orderTrackingUrl}" class="cta-button">Track Your Order</a>
          
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Your payment is protected by our escrow system. Funds are only released to the vendor after you confirm delivery.</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
          <p>Questions? Reply to this email or contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // NEW: Order Accepted by Vendor
  buyerOrderAccepted: (data: {
    customerName: string;
    orderId: string;
    items: string;
    vendorName: string;
    estimatedShipDate: string;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .status-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 20px; font-size: 14px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Order Accepted!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Great news! <strong>${data.vendorName}</strong> has accepted your order and is preparing it for shipment.</p>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
            <p><strong>Vendor:</strong> ${data.vendorName}</p>
            <p><strong>Expected to ship by:</strong> ${data.estimatedShipDate}</p>
            <p><span class="status-badge">📦 Preparing for Shipment</span></p>
          </div>
          
          <p>You'll receive another email with tracking information once your order ships.</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // NEW: Order Shipped with Tracking
  buyerOrderShipped: (data: {
    customerName: string;
    orderId: string;
    items: string;
    vendorName: string;
    courierName: string;
    trackingNumber: string;
    deliveryNotes: string;
    orderTrackingUrl: string;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .tracking-box { background: #fef3c7; border: 2px dashed #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .tracking-number { font-size: 24px; font-weight: bold; color: #92400e; letter-spacing: 2px; }
        .status-badge { display: inline-block; background: #ede9fe; color: #5b21b6; padding: 6px 12px; border-radius: 20px; font-size: 14px; }
        .cta-button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .important-notice { background: #fee2e2; border: 1px solid #dc2626; padding: 12px; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🚚 Your Order Has Shipped!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Your order from <strong>${data.vendorName}</strong> is on its way!</p>
          
          <div class="tracking-box">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Tracking Number</p>
            <p class="tracking-number">${data.trackingNumber}</p>
            <p style="margin: 0; font-size: 14px;">via <strong>${data.courierName}</strong></p>
          </div>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
            ${data.deliveryNotes ? `<p><strong>Delivery Notes:</strong> ${data.deliveryNotes}</p>` : ''}
            <p><span class="status-badge">🚚 In Transit</span></p>
          </div>
          
          <a href="${data.orderTrackingUrl}" class="cta-button">Track Your Order</a>
          
          <div class="important-notice">
            <strong>⚠️ Important:</strong> Once you receive your order, please confirm delivery on Solely to release payment to the vendor. If you don't confirm within 3 days of delivery, it will be auto-released.
          </div>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
          <p>Questions? Reply to this email or contact support.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // NEW: Pickup Ready Notification
  buyerPickupReady: (data: {
    customerName: string;
    orderId: string;
    items: string;
    vendorName: string;
    vendorAddress: string;
    vendorPhone: string;
    vendorWhatsApp: string;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9faf";
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .location-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .contact-buttons { display: flex; gap: 10px; margin-top: 15px; }
        .contact-button { display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; flex: 1; text-align: center; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📦 Your Order is Ready for Pickup!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Great news! Your order from <strong>${data.vendorName}</strong> is ready for collection.</p>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
          </div>
          
          <div class="location-box">
            <p style="margin: 0 0 10px 0; font-weight: bold;">📍 Pickup Location:</p>
            <p style="margin: 0;">${data.vendorAddress}</p>
          </div>
          
          <p><strong>Contact the seller to arrange pickup time:</strong></p>
          <div class="contact-buttons">
            <a href="https://wa.me/${data.vendorWhatsApp.replace(/[^0-9]/g, '')}" class="contact-button" style="background: #25D366;">
              WhatsApp
            </a>
            <a href="tel:${data.vendorPhone}" class="contact-button" style="background: #3b82f6;">
              Call
            </a>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Remember to confirm delivery on Solely after you collect your order to release payment to the vendor.</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // NEW: Order Completed - Review Request
  buyerOrderCompleted: (data: {
    customerName: string;
    orderId: string;
    items: string;
    reviewUrl: string;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .cta-button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Order Completed - Thank You!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.customerName},</p>
          <p>Your order has been completed successfully! We hope you love your purchase.</p>
          
          <div class="order-details">
            <p><strong>Order #${data.orderId}</strong></p>
            <p><strong>Items:</strong> ${data.items}</p>
          </div>
          
          <p><strong>How was your experience?</strong></p>
          <p>Your feedback helps other buyers make informed decisions and helps vendors improve their service.</p>
          
          <div style="text-align: center;">
            <a href="${data.reviewUrl}" class="cta-button">Leave a Review</a>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Thank you for shopping with Solely Kenya!</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // NEW: Vendor Payment Released
  vendorPaymentReleased: (data: {
    vendorName: string;
    orderId: string;
    payoutAmount: number;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .payment-box { background: #d1fae5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
        .amount { font-size: 36px; font-weight: bold; color: #059669; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">💰 Payment Released!</h1>
        </div>
        <div class="content">
          <p>Hi ${data.vendorName},</p>
          <p>Great news! The buyer has confirmed delivery for order #${data.orderId}.</p>
          
          <div class="payment-box">
            <p style="margin: 0 0 10px 0; color: #6b7280;">Funds Released</p>
            <p class="amount">KES ${data.payoutAmount.toLocaleString()}</p>
          </div>
          
          <p>The funds have been released from escrow and will be processed for payout according to your payment schedule.</p>
          <p style="font-size: 14px; color: #6b7280;">Thank you for providing excellent service to your buyers!</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
        </div>
      </div>
    </body>
    </html>
  `,

  // NEW: Dispute Filed
  disputeFiled: (data: {
    userName: string;
    orderId: string;
    reason: string;
    description: string;
    isVendor: boolean;
  }) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .dispute-box { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .info-box { background: #e0f2fe; border: 1px solid #0284c7; padding: 12px; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⚠️ Dispute Filed</h1>
        </div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          <p>${data.isVendor ? 'A buyer has filed a dispute' : 'Your dispute has been submitted'} for order #${data.orderId}.</p>
          
          <div class="dispute-box">
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p><strong>Description:</strong> ${data.description}</p>
          </div>
          
          <div class="info-box">
            <strong>What happens next?</strong>
            <ol style="margin: 10px 0; padding-left: 20px;">
              <li>Solely support team will review the dispute</li>
              <li>${data.isVendor ? 'We may contact you for additional information' : 'The vendor will be notified'}</li>
              <li>Funds are frozen until resolution</li>
              <li>Admin will make a final decision and notify both parties</li>
            </ol>
          </div>
          
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Our support team aims to resolve disputes within 3-5 business days.</p>
        </div>
        <div class="footer">
          <p>This email was sent by Solely Kenya</p>
          <p>If you have additional information, please reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

