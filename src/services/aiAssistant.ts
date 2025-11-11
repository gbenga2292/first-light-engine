import nlp from 'compromise';
import { UserRole } from '@/contexts/AuthContext';
import { Asset, Waybill, Site, Employee, Vehicle } from '@/types/asset';

export interface AIIntent {
  action: 'create_waybill' | 'add_asset' | 'process_return' | 'create_site' | 
          'add_employee' | 'add_vehicle' | 'generate_report' | 'view_analytics' |
          'send_to_site' | 'check_inventory' | 'update_asset' | 'unknown';
  confidence: number;
  parameters: Record<string, any>;
  missingParameters: string[];
}

export interface AIResponse {
  success: boolean;
  message: string;
  intent?: AIIntent;
  suggestedAction?: {
    type: 'open_form' | 'execute_action' | 'clarify';
    data?: any;
  };
}

export class AIAssistantService {
  private userRole: UserRole;
  private assets: Asset[];
  private sites: Site[];
  private employees: Employee[];
  private vehicles: Vehicle[];

  constructor(
    userRole: UserRole,
    assets: Asset[] = [],
    sites: Site[] = [],
    employees: Employee[] = [],
    vehicles: Vehicle[] = []
  ) {
    this.userRole = userRole;
    this.assets = assets;
    this.sites = sites;
    this.employees = employees;
    this.vehicles = vehicles;
  }

  updateContext(
    assets: Asset[],
    sites: Site[],
    employees: Employee[],
    vehicles: Vehicle[]
  ) {
    this.assets = assets;
    this.sites = sites;
    this.employees = employees;
    this.vehicles = vehicles;
  }

  async processInput(userInput: string): Promise<AIResponse> {
    const doc = nlp(userInput.toLowerCase());
    
    // Identify intent
    const intent = this.identifyIntent(doc, userInput);
    
    // Check permissions
    const permissionCheck = this.checkPermissions(intent.action);
    if (!permissionCheck.allowed) {
      return {
        success: false,
        message: permissionCheck.message,
        intent
      };
    }

    // If missing parameters, ask for clarification
    if (intent.missingParameters.length > 0) {
      return {
        success: false,
        message: this.generateClarificationMessage(intent),
        intent,
        suggestedAction: { type: 'clarify' }
      };
    }

    // Generate response based on intent
    return this.generateActionResponse(intent);
  }

  private identifyIntent(doc: any, rawInput: string): AIIntent {
    const text = rawInput.toLowerCase();
    
    // Waybill creation patterns
    if (this.matchesPattern(text, ['create', 'waybill']) || 
        this.matchesPattern(text, ['new', 'waybill']) ||
        this.matchesPattern(text, ['send', 'site']) ||
        this.matchesPattern(text, ['dispatch'])) {
      return this.parseWaybillIntent(doc, text);
    }

    // Asset addition patterns
    if (this.matchesPattern(text, ['add', 'asset']) ||
        this.matchesPattern(text, ['new', 'asset']) ||
        this.matchesPattern(text, ['add', 'item']) ||
        this.matchesPattern(text, ['create', 'asset'])) {
      return this.parseAssetIntent(doc, text);
    }

    // Return processing patterns
    if (this.matchesPattern(text, ['process', 'return']) ||
        this.matchesPattern(text, ['return', 'from']) ||
        this.matchesPattern(text, ['receive', 'back'])) {
      return this.parseReturnIntent(doc, text);
    }

    // Site management patterns
    if (this.matchesPattern(text, ['create', 'site']) ||
        this.matchesPattern(text, ['add', 'site']) ||
        this.matchesPattern(text, ['new', 'site'])) {
      return this.parseSiteIntent(doc, text);
    }

    // Inventory check patterns
    if (this.matchesPattern(text, ['check', 'inventory']) ||
        this.matchesPattern(text, ['show', 'stock']) ||
        this.matchesPattern(text, ['inventory', 'level']) ||
        this.matchesPattern(text, ['how', 'many'])) {
      return this.parseInventoryCheckIntent(doc, text);
    }

    // Analytics patterns
    if (this.matchesPattern(text, ['show', 'analytics']) ||
        this.matchesPattern(text, ['view', 'analytics']) ||
        this.matchesPattern(text, ['report']) ||
        this.matchesPattern(text, ['statistics'])) {
      return this.parseAnalyticsIntent(doc, text);
    }

    return {
      action: 'unknown',
      confidence: 0,
      parameters: {},
      missingParameters: []
    };
  }

  private matchesPattern(text: string, keywords: string[]): boolean {
    return keywords.every(keyword => text.includes(keyword));
  }

  private parseWaybillIntent(doc: any, text: string): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract site name
    const siteMatch = this.findSiteInText(text);
    if (siteMatch) {
      parameters.siteName = siteMatch.name;
      parameters.siteId = siteMatch.id;
    } else {
      missingParameters.push('site');
    }

    // Extract quantities and items
    const numbers = doc.numbers().out('array');
    const items = this.findAssetsInText(text);
    
    if (items.length > 0) {
      parameters.items = items;
    } else {
      missingParameters.push('items');
    }

    // Extract driver/employee
    const employee = this.findEmployeeInText(text);
    if (employee) {
      parameters.driver = employee.name;
      parameters.driverId = employee.id;
    }

    // Extract vehicle
    const vehicle = this.findVehicleInText(text);
    if (vehicle) {
      parameters.vehicle = vehicle.registration_number || vehicle.name;
      parameters.vehicleId = vehicle.id;
    }

    // Extract purpose
    const purposeMatch = text.match(/for\s+(.+?)(?:\s+with|\s+to|\.|$)/i);
    if (purposeMatch) {
      parameters.purpose = purposeMatch[1].trim();
    }

    return {
      action: 'create_waybill',
      confidence: 0.8,
      parameters,
      missingParameters
    };
  }

  private parseAssetIntent(doc: any, text: string): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract asset name (typically after "add" or "create")
    const nameMatch = text.match(/(?:add|create|new)\s+(?:asset\s+)?["']?([^"',]+)["']?/i);
    if (nameMatch) {
      parameters.name = nameMatch[1].trim();
    } else {
      missingParameters.push('name');
    }

    // Extract quantity
    const numbers = doc.numbers().out('array');
    if (numbers.length > 0) {
      parameters.quantity = parseInt(numbers[0]);
    } else {
      missingParameters.push('quantity');
    }

    // Extract category
    if (text.includes('dewatering')) {
      parameters.category = 'dewatering';
    } else if (text.includes('waterproofing')) {
      parameters.category = 'waterproofing';
    } else if (text.includes('consumable')) {
      parameters.type = 'consumable';
    } else if (text.includes('equipment')) {
      parameters.type = 'equipment';
    }

    // Extract unit
    const unitMatch = text.match(/\b(units?|pieces?|bags?|drums?|liters?|kg|meters?)\b/i);
    if (unitMatch) {
      parameters.unit = unitMatch[1];
    }

    return {
      action: 'add_asset',
      confidence: 0.8,
      parameters,
      missingParameters
    };
  }

  private parseReturnIntent(doc: any, text: string): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract site
    const site = this.findSiteInText(text);
    if (site) {
      parameters.siteName = site.name;
      parameters.siteId = site.id;
    } else {
      missingParameters.push('site');
    }

    // Extract items being returned
    const items = this.findAssetsInText(text);
    if (items.length > 0) {
      parameters.items = items;
    } else {
      missingParameters.push('items');
    }

    return {
      action: 'process_return',
      confidence: 0.75,
      parameters,
      missingParameters
    };
  }

  private parseSiteIntent(doc: any, text: string): AIIntent {
    const parameters: Record<string, any> = {};
    const missingParameters: string[] = [];

    // Extract site name
    const nameMatch = text.match(/(?:site|location)\s+["']?([^"',]+)["']?/i);
    if (nameMatch) {
      parameters.name = nameMatch[1].trim();
    } else {
      missingParameters.push('name');
    }

    // Extract address
    const addressMatch = text.match(/(?:at|address|located at)\s+(.+?)(?:\.|$)/i);
    if (addressMatch) {
      parameters.address = addressMatch[1].trim();
    }

    return {
      action: 'create_site',
      confidence: 0.7,
      parameters,
      missingParameters
    };
  }

  private parseInventoryCheckIntent(doc: any, text: string): AIIntent {
    const parameters: Record<string, any> = {};
    
    // Check if asking about specific asset
    const asset = this.findAssetsInText(text)[0];
    if (asset) {
      parameters.assetName = asset.name;
      parameters.assetId = asset.id;
    }

    // Check if asking about specific site
    const site = this.findSiteInText(text);
    if (site) {
      parameters.siteName = site.name;
      parameters.siteId = site.id;
    }

    return {
      action: 'check_inventory',
      confidence: 0.85,
      parameters,
      missingParameters: []
    };
  }

  private parseAnalyticsIntent(doc: any, text: string): AIIntent {
    const parameters: Record<string, any> = {};
    
    // Check for specific analytics type
    if (text.includes('consumable')) {
      parameters.type = 'consumable';
    } else if (text.includes('equipment') || text.includes('machine')) {
      parameters.type = 'equipment';
    } else if (text.includes('site')) {
      parameters.type = 'site';
    }

    const site = this.findSiteInText(text);
    if (site) {
      parameters.siteName = site.name;
      parameters.siteId = site.id;
    }

    return {
      action: 'view_analytics',
      confidence: 0.75,
      parameters,
      missingParameters: []
    };
  }

  private findSiteInText(text: string): Site | null {
    for (const site of this.sites) {
      if (text.toLowerCase().includes(site.name.toLowerCase())) {
        return site;
      }
    }
    return null;
  }

  private findAssetsInText(text: string): Array<{ id: string; name: string; quantity?: number }> {
    const found: Array<{ id: string; name: string; quantity?: number }> = [];
    
    for (const asset of this.assets) {
      const assetNameLower = asset.name.toLowerCase();
      if (text.includes(assetNameLower)) {
        // Try to find quantity associated with this asset
        const assetIndex = text.indexOf(assetNameLower);
        const beforeText = text.substring(Math.max(0, assetIndex - 20), assetIndex);
        const quantityMatch = beforeText.match(/(\d+)\s*$/);
        
        found.push({
          id: asset.id,
          name: asset.name,
          quantity: quantityMatch ? parseInt(quantityMatch[1]) : undefined
        });
      }
    }
    
    return found;
  }

  private findEmployeeInText(text: string): Employee | null {
    for (const employee of this.employees) {
      if (text.toLowerCase().includes(employee.name.toLowerCase())) {
        return employee;
      }
    }
    return null;
  }

  private findVehicleInText(text: string): Vehicle | null {
    for (const vehicle of this.vehicles) {
      const regNumber = vehicle.registration_number || vehicle.name;
      if (text.toLowerCase().includes(regNumber.toLowerCase())) {
        return vehicle;
      }
    }
    return null;
  }

  private checkPermissions(action: AIIntent['action']): { allowed: boolean; message: string } {
    const rolePermissions: Record<UserRole, AIIntent['action'][]> = {
      admin: [
        'create_waybill', 'add_asset', 'process_return', 'create_site',
        'add_employee', 'add_vehicle', 'generate_report', 'view_analytics',
        'send_to_site', 'check_inventory', 'update_asset'
      ],
      data_entry_supervisor: [
        'create_waybill', 'add_asset', 'process_return', 'check_inventory',
        'view_analytics', 'send_to_site', 'update_asset'
      ],
      regulatory: [
        'check_inventory', 'view_analytics', 'generate_report'
      ],
      manager: [
        'create_waybill', 'add_asset', 'process_return', 'check_inventory',
        'view_analytics', 'generate_report', 'send_to_site'
      ],
      staff: [
        'check_inventory', 'view_analytics'
      ]
    };

    const allowed = rolePermissions[this.userRole]?.includes(action) || false;
    
    if (!allowed) {
      return {
        allowed: false,
        message: `You don't have permission to perform this action. Your role (${this.userRole}) cannot execute: ${action.replace(/_/g, ' ')}`
      };
    }

    return { allowed: true, message: '' };
  }

  private generateClarificationMessage(intent: AIIntent): string {
    const action = intent.action.replace(/_/g, ' ');
    const missing = intent.missingParameters.join(', ');
    
    return `I understand you want to ${action}. However, I need more information about: ${missing}. Please provide these details.`;
  }

  private generateActionResponse(intent: AIIntent): AIResponse {
    switch (intent.action) {
      case 'create_waybill':
        return {
          success: true,
          message: `I'll help you create a waybill${intent.parameters.siteName ? ` for ${intent.parameters.siteName}` : ''}.`,
          intent,
          suggestedAction: {
            type: 'open_form',
            data: {
              formType: 'waybill',
              prefillData: intent.parameters
            }
          }
        };

      case 'add_asset':
        return {
          success: true,
          message: `I'll help you add${intent.parameters.name ? ` ${intent.parameters.name}` : ' a new asset'} to the inventory.`,
          intent,
          suggestedAction: {
            type: 'open_form',
            data: {
              formType: 'asset',
              prefillData: intent.parameters
            }
          }
        };

      case 'process_return':
        return {
          success: true,
          message: `I'll help you process a return${intent.parameters.siteName ? ` from ${intent.parameters.siteName}` : ''}.`,
          intent,
          suggestedAction: {
            type: 'open_form',
            data: {
              formType: 'return',
              prefillData: intent.parameters
            }
          }
        };

      case 'check_inventory':
        return this.generateInventoryResponse(intent.parameters);

      case 'view_analytics':
        return {
          success: true,
          message: `Opening analytics dashboard${intent.parameters.siteName ? ` for ${intent.parameters.siteName}` : ''}.`,
          intent,
          suggestedAction: {
            type: 'execute_action',
            data: {
              action: 'open_analytics',
              parameters: intent.parameters
            }
          }
        };

      case 'create_site':
        return {
          success: true,
          message: `I'll help you create a new site${intent.parameters.name ? ` called ${intent.parameters.name}` : ''}.`,
          intent,
          suggestedAction: {
            type: 'open_form',
            data: {
              formType: 'site',
              prefillData: intent.parameters
            }
          }
        };

      default:
        return {
          success: false,
          message: "I'm not sure what you want me to do. Can you rephrase that?",
          intent
        };
    }
  }

  private generateInventoryResponse(params: any): AIResponse {
    let message = '';
    
    if (params.assetId) {
      const asset = this.assets.find(a => a.id === params.assetId);
      if (asset) {
        message = `${asset.name}: ${asset.quantity} ${asset.unitOfMeasurement} in stock`;
        if (asset.availableQuantity !== undefined) {
          message += ` (${asset.availableQuantity} available)`;
        }
        if (params.siteId && asset.siteQuantities) {
          const siteQty = asset.siteQuantities[params.siteId];
          if (siteQty !== undefined) {
            message += `, ${siteQty} at ${params.siteName}`;
          }
        }
      } else {
        message = `Asset not found: ${params.assetName}`;
      }
    } else if (params.siteId) {
      const siteAssets = this.assets.filter(a => 
        a.siteQuantities && a.siteQuantities[params.siteId] > 0
      );
      message = `${params.siteName} has ${siteAssets.length} different items. `;
      message += siteAssets.slice(0, 5).map(a => 
        `${a.name}: ${a.siteQuantities![params.siteId]}`
      ).join(', ');
      if (siteAssets.length > 5) {
        message += ` and ${siteAssets.length - 5} more...`;
      }
    } else {
      const totalAssets = this.assets.length;
      const totalQty = this.assets.reduce((sum, a) => sum + a.quantity, 0);
      const lowStock = this.assets.filter(a => a.quantity > 0 && a.quantity < 10).length;
      const outOfStock = this.assets.filter(a => a.quantity === 0).length;
      
      message = `Total inventory: ${totalAssets} items (${totalQty} units). `;
      if (lowStock > 0) message += `${lowStock} items low on stock. `;
      if (outOfStock > 0) message += `${outOfStock} items out of stock.`;
    }

    return {
      success: true,
      message,
      intent: {
        action: 'check_inventory',
        confidence: 0.9,
        parameters: params,
        missingParameters: []
      }
    };
  }
}
