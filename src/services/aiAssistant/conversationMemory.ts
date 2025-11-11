import { AIIntent, ConversationMessage } from './types';

export class ConversationMemory {
  private history: ConversationMessage[] = [];
  private maxHistory: number = 10; // Keep last 10 exchanges

  addMessage(userInput: string, intent: AIIntent): void {
    this.history.push({
      id: Date.now().toString(),
      userInput,
      intent,
      timestamp: new Date(),
      resolved: intent.missingParameters.length === 0
    });

    // Trim history if too long
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * Get the most recent message
   */
  getLastMessage(): ConversationMessage | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Get recent messages (default: last 5)
   */
  getRecentMessages(count: number = 5): ConversationMessage[] {
    return this.history.slice(-count);
  }

  /**
   * Try to resolve missing parameters from conversation history
   */
  resolveFromHistory(missingParam: string): any {
    // Search backwards through history
    for (let i = this.history.length - 1; i >= 0; i--) {
      const msg = this.history[i];
      
      // Check if this parameter was present in a previous message
      if (msg.intent.parameters[missingParam] !== undefined) {
        return msg.intent.parameters[missingParam];
      }
      
      // Check related parameters (e.g., siteId when looking for siteName)
      if (missingParam === 'siteName' && msg.intent.parameters.siteName) {
        return msg.intent.parameters.siteName;
      }
      if (missingParam === 'siteId' && msg.intent.parameters.siteId) {
        return msg.intent.parameters.siteId;
      }
    }
    
    return null;
  }

  /**
   * Check if the current input is a follow-up to previous message
   */
  isFollowUp(currentInput: string): boolean {
    const lastMsg = this.getLastMessage();
    if (!lastMsg) return false;

    // Check for follow-up indicators
    const followUpPatterns = [
      /^(yes|yeah|yep|sure|ok|okay)/i,
      /^(no|nope|nah)/i,
      /^(more|another|add|also)/i,
      /^(\d+)/,  // Starting with a number (likely answering "how many?")
    ];

    return followUpPatterns.some(pattern => pattern.test(currentInput.trim()));
  }

  /**
   * Get the context from recent conversation for intent enhancement
   */
  getContextualHints(): {
    likelySiteId?: string;
    likelySiteName?: string;
    likelyAction?: string;
    recentItems?: Array<{ id: string; name: string }>;
  } {
    const recent = this.getRecentMessages(3);
    const hints: any = {};

    for (const msg of recent) {
      if (msg.intent.parameters.siteId && !hints.likelySiteId) {
        hints.likelySiteId = msg.intent.parameters.siteId;
        hints.likelySiteName = msg.intent.parameters.siteName;
      }
      if (msg.intent.action && !hints.likelyAction) {
        hints.likelyAction = msg.intent.action;
      }
      if (msg.intent.parameters.items && !hints.recentItems) {
        hints.recentItems = msg.intent.parameters.items;
      }
    }

    return hints;
  }

  /**
   * Clear conversation history
   */
  clear(): void {
    this.history = [];
  }

  /**
   * Get full history
   */
  getHistory(): ConversationMessage[] {
    return [...this.history];
  }
}
