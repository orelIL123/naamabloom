import { MessageProvider, SendMessageParams, SendMessageResult } from '../types';

export class SMS4FreeProvider implements MessageProvider {
  name = 'sms4free';
  private apiKey: string;
  private user: string;
  private pass: string;
  private sender: string;
  private enabled: boolean;
  private endpoint = 'https://www.sms4free.co.il/ApiSMS/SendSMS';

  constructor(cfg: { apiKey: string; user: string; pass: string; sender: string; enabled: boolean }) {
    this.apiKey = cfg.apiKey;
    this.user = cfg.user;
    this.pass = cfg.pass;
    this.sender = cfg.sender;
    this.enabled = cfg.enabled;
  }

  isAvailable(): boolean {
    return this.enabled && !!this.apiKey && !!this.user && !!this.pass && !!this.sender;
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'SMS4FREE not available', provider: this.name };
    }

    try {
      // Ensure message is short (<70 characters in Hebrew) to avoid splitting
      const message = params.message.length > 70 ? params.message.substring(0, 67) + '...' : params.message;
      // Normalize recipient to digits-only (remove + and ensure it starts with 0)
      let recipient = (params.to || '').replace(/[^0-9]/g, '');
      if (recipient.startsWith('972')) {
        recipient = '0' + recipient.substring(3);
      }
      
      console.log(`📱 SMS4FREE: Sending SMS to ${recipient} via ${this.sender}`);
      console.log(`📱 SMS4FREE: Message: "${message}"`);

      // Use POST method with form data (SMS4Free standard)
      const formData = new URLSearchParams();
      formData.append('key', this.apiKey);
      formData.append('user', this.user);
      formData.append('pass', this.pass);
      formData.append('sender', this.sender);
      formData.append('recipient', recipient);
      formData.append('msg', message);
      
      console.log(`📱 SMS4FREE: Sending POST to: ${this.endpoint}`);
      console.log(`📱 SMS4FREE: Form data:`, formData.toString());
      
      const response = await fetch(this.endpoint, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (compatible; SMS4Free-Client/1.0)',
        },
        body: formData.toString()
      });

      const responseText = await response.text();
      console.log(`📱 SMS4FREE: Response status: ${response.status}`);
      console.log(`📱 SMS4FREE: Response text: ${responseText}`);

      // Parse response - SMS4Free typically returns simple text responses
      if (response.ok) {
        // Look for success indicators
        const successIndicators = [
          /status\s*[:=]\s*1/i,
          /success/i,
          /sent/i,
          /ok/i,
          /^\d+$/,  // Just a number (message ID)
          /^1$/     // Sometimes just returns "1" for success
        ];
        
        const isSuccess = successIndicators.some(pattern => pattern.test(responseText.trim()));
        
        if (isSuccess) {
          // Extract message ID if available
          const idMatch = responseText.match(/(\d+)/);
          const messageId = idMatch ? idMatch[1] : 'success';
          
          console.log(`✅ SMS4FREE: Message sent successfully! ID: ${messageId}`);
          
          return { 
            success: true, 
            messageId, 
            provider: this.name 
          };
        }
      }

      // Check for specific error messages
      const errorPatterns = [
        { pattern: /invalid/i, message: 'Invalid credentials or parameters' },
        { pattern: /unauthorized/i, message: 'Unauthorized access' },
        { pattern: /insufficient/i, message: 'Insufficient credits' },
        { pattern: /blocked/i, message: 'Number or sender blocked' }
      ];

      let errorMessage = responseText || 'Unknown error';
      for (const { pattern, message } of errorPatterns) {
        if (pattern.test(responseText)) {
          errorMessage = message;
          break;
        }
      }

      return { 
        success: false, 
        error: `SMS4Free API error: ${response.status} - ${errorMessage}`, 
        provider: this.name 
      };

    } catch (e: any) {
      console.error('📱 SMS4FREE Error:', e);
      return { success: false, error: `SMS4Free request failed: ${e.message}`, provider: this.name };
    }
  }
}
