export { MessagingService } from './messagingService';
export { VonageProvider } from './providers/vonageProvider';
export { WhatsAppProvider } from './providers/whatsappProvider';
export type { 
  MessageProvider, 
  SendMessageParams, 
  SendMessageResult, 
  MessagingConfig 
} from './types';

import { MessagingService } from './messagingService';
import { messagingConfig } from '../../config/messaging';

// Create singleton instance with configuration
export const messagingService = new MessagingService(messagingConfig);