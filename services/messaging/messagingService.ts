import { SMS4FreeProvider } from './providers/sms4freeProvider';
import { VonageProvider } from './providers/vonageProvider';
import { WhatsAppProvider } from './providers/whatsappProvider';
import { MessageProvider, MessagingConfig, SendMessageParams, SendMessageResult } from './types';

export class MessagingService {
  private providers: Map<string, MessageProvider> = new Map();
  private config: MessagingConfig;

  constructor(config: MessagingConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders() {
    // SMS4FREE provider
    if ((this.config as any).providers.sms4free) {
      const cfg = (this.config as any).providers.sms4free as any;
      this.providers.set('sms4free', new SMS4FreeProvider(cfg));
    }

    // Vonage provider as fallback
    if ((this.config as any).providers.vonage) {
      const cfg = (this.config as any).providers.vonage as any;
      this.providers.set('vonage', new VonageProvider(cfg));
    }

    // Initialize WhatsApp provider if configured
    if (this.config.providers.whatsapp) {
      const whatsappProvider = new WhatsAppProvider(this.config.providers.whatsapp);
      this.providers.set('whatsapp', whatsappProvider);
    }
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const primaryProvider = this.providers.get(this.config.defaultProvider);

    if (!primaryProvider) {
      throw new Error(`Default provider '${this.config.defaultProvider}' not available`);
    }

    try {
      const result = await primaryProvider.send(params);
      
      // If primary provider fails, try fallback providers
      if (!result.success && this.config.fallbackEnabled) {
        console.log(`⚠️ Primary provider ${this.config.defaultProvider} failed, trying fallback providers...`);
        
        for (const [name, provider] of this.providers.entries()) {
          if (name !== this.config.defaultProvider && provider.isAvailable()) {
            console.log(`🔄 Trying fallback provider: ${name}`);
            try {
              const fallbackResult = await provider.send(params);
              if (fallbackResult.success) {
                console.log(`✅ Fallback provider ${name} succeeded`);
                return fallbackResult;
              }
            } catch (fallbackError) {
              console.log(`❌ Fallback provider ${name} failed:`, fallbackError);
            }
          }
        }
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: this.config.defaultProvider,
      };
    }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name]) => name);
  }

  updateConfig(newConfig: Partial<MessagingConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.providers.clear();
    this.initializeProviders();
  }
}