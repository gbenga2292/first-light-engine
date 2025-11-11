import { UserRole } from '@/contexts/AuthContext';
import { Asset, Site, Employee, Vehicle } from '@/types/asset';
import { AIIntent, AIResponse, AIContext, ActionExecutionContext } from './types';
import { EntityExtractor } from './entityExtraction';
import { IntentRecognizer } from './intentRecognition';
import { PermissionChecker } from './permissionChecker';
import { ConfidenceCalculator } from './confidenceCalculator';
import { ActionExecutor } from './actionExecutor';
import { ConversationMemory } from './conversationMemory';

export * from './types';

export class AIAssistantService {
  private context: AIContext;
  private entityExtractor: EntityExtractor;
  private conversationMemory: ConversationMemory;
  private intentRecognizer: IntentRecognizer;
  private permissionChecker: PermissionChecker;
  private confidenceCalculator: ConfidenceCalculator;
  private actionExecutor: ActionExecutor;

  constructor(
    userRole: UserRole,
    assets: Asset[] = [],
    sites: Site[] = [],
    employees: Employee[] = [],
    vehicles: Vehicle[] = []
  ) {
    this.context = { assets, sites, employees, vehicles, userRole };
    
    this.entityExtractor = new EntityExtractor(sites, assets, employees, vehicles);
    this.conversationMemory = new ConversationMemory();
    this.intentRecognizer = new IntentRecognizer(this.context, this.entityExtractor, this.conversationMemory);
    this.permissionChecker = new PermissionChecker(userRole);
    this.confidenceCalculator = new ConfidenceCalculator();
    this.actionExecutor = new ActionExecutor(this.context);
  }

  /**
   * Update context when data changes
   */
  updateContext(
    assets: Asset[],
    sites: Site[],
    employees: Employee[],
    vehicles: Vehicle[]
  ): void {
    this.context.assets = assets;
    this.context.sites = sites;
    this.context.employees = employees;
    this.context.vehicles = vehicles;
    
    this.entityExtractor.updateContext(sites, assets, employees, vehicles);
  }

  /**
   * Set execution context for direct action execution
   */
  setExecutionContext(executionContext: ActionExecutionContext): void {
    this.actionExecutor = new ActionExecutor(this.context, executionContext);
  }

  /**
   * Process user input and generate response
   */
  async processInput(userInput: string): Promise<AIResponse> {
    // Step 1: Identify intent
    let intent = this.intentRecognizer.identifyIntent(userInput);

    // Step 2: Try to resolve missing parameters from history
    if (intent.missingParameters.length > 0) {
      intent = this.resolveParametersFromHistory(intent);
    }

    // Step 3: Recalculate confidence with resolved parameters
    intent.confidence = this.confidenceCalculator.calculateConfidence(intent);

    // Step 4: Save to conversation memory
    this.conversationMemory.addMessage(userInput, intent);

    // Step 5: Check permissions
    const permissionCheck = this.permissionChecker.checkPermission(intent.action);
    if (!permissionCheck.allowed) {
      return {
        success: false,
        message: permissionCheck.message,
        intent
      };
    }

    // Step 6: If still missing critical parameters, ask for clarification
    if (intent.missingParameters.length > 0) {
      return {
        success: false,
        message: this.generateClarificationMessage(intent),
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    // Step 7: Execute action or suggest form
    return await this.actionExecutor.executeAction(intent);
  }

  /**
   * Resolve missing parameters from conversation history
   */
  private resolveParametersFromHistory(intent: AIIntent): AIIntent {
    const resolved = { ...intent };
    const stillMissing: string[] = [];

    for (const param of intent.missingParameters) {
      const value = this.conversationMemory.resolveFromHistory(param);
      if (value !== null) {
        resolved.parameters[param] = value;
      } else {
        stillMissing.push(param);
      }
    }

    resolved.missingParameters = stillMissing;
    return resolved;
  }

  /**
   * Generate clarification message for missing parameters
   */
  private generateClarificationMessage(intent: AIIntent): string {
    const action = intent.action.replace(/_/g, ' ');
    const missing = intent.missingParameters;

    if (missing.length === 1) {
      const param = missing[0];
      const suggestions = this.getSuggestionsForParameter(param);
      
      let message = `I understand you want to ${action}. `;
      message += `However, I need to know: which ${param}?`;
      
      if (suggestions.length > 0) {
        message += `\n\nAvailable options:\n${suggestions.slice(0, 5).join('\n')}`;
        if (suggestions.length > 5) {
          message += `\n... and ${suggestions.length - 5} more`;
        }
      }
      
      return message;
    }

    return `I understand you want to ${action}. However, I need more information about: ${missing.join(', ')}. Please provide these details.`;
  }

  /**
   * Get suggestions for a missing parameter
   */
  private getSuggestionsForParameter(param: string): string[] {
    switch (param) {
      case 'site':
        return this.context.sites.map(s => `• ${s.name}`);
      case 'items':
        return this.context.assets.slice(0, 10).map(a => `• ${a.name}`);
      case 'driver':
        return this.context.employees.map(e => `• ${e.name}`);
      case 'vehicle':
        return this.context.vehicles.map(v => `• ${v.registration_number || v.name}`);
      default:
        return [];
    }
  }

  /**
   * Clear conversation history
   */
  clearConversation(): void {
    this.conversationMemory.clear();
  }

  /**
   * Get conversation history
   */
  getConversationHistory() {
    return this.conversationMemory.getHistory();
  }
}
