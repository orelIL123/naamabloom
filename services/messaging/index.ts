export { MessagingService } from './messagingService';
export { SMS4FreeProvider } from './providers/sms4freeProvider';
export { WhatsAppProvider } from './providers/whatsappProvider';
export type {
    MessageProvider, MessagingConfig, SendMessageParams,
    SendMessageResult
} from './types';

import { messagingConfig } from '../../config/messaging';
import { MessagingService } from './messagingService';

// Create singleton instance with configuration
export const messagingService = new MessagingService(messagingConfig);
