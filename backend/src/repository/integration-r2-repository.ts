import { IntegrationConfig, IntegrationRepository } from '../../../shared/types';

export class IntegrationR2Repository implements IntegrationRepository {
  private r2Key: string;

  constructor(private r2: R2Bucket, userPrefix?: string) {
    // Create a sanitized prefix from the user prefix
    this.r2Key = userPrefix ? `${userPrefix}/integration_config.jsonl` : 'integration_config.jsonl';
  }

  async getIntegrations(): Promise<IntegrationConfig[]> {
    try {
      let object = await this.r2.get(this.r2Key);
      
      if (!object) {
        console.log('No integrations configuration found in R2');
        return [];
      }
      
      const content = await object.text();
      
      // Parse JSONL format (each line is a JSON object)
      const integrations = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
      
      return integrations;
    } catch (error) {
      console.error('Error fetching integrations from R2:', error);
      return [];
    }
  }

  async addIntegration(integration: IntegrationConfig): Promise<void> {
    try {
      // Get existing integrations
      const integrations = await this.getIntegrations();
      
      // Add the new integration
      integrations.push(integration);
      
      // Save the updated list
      const content = integrations.map(i => JSON.stringify(i)).join('\n');
      
      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error adding integration to R2:', error);
      throw error;
    }
  }

  async updateIntegration(name: string, updatedIntegration: IntegrationConfig): Promise<void> {
    try {
      // Get existing integrations
      const integrations = await this.getIntegrations();
      
      // Find the integration to update
      const index = integrations.findIndex(integration => integration.name === name);
      if (index === -1) {
        throw new Error(`Integration with name ${name} not found`);
      }
      
      // Update the integration
      integrations[index] = updatedIntegration;
      
      // Save the updated list
      const content = integrations.map(i => JSON.stringify(i)).join('\n');
      
      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error updating integration in R2:', error);
      throw error;
    }
  }

  async deleteIntegration(name: string): Promise<void> {
    try {
      // Get existing integrations
      const integrations = await this.getIntegrations();
      
      // Filter out the integration to delete
      const updatedIntegrations = integrations.filter(integration => integration.name !== name);
      
      // If no integrations were removed, the integration wasn't found
      if (updatedIntegrations.length === integrations.length) {
        throw new Error(`Integration with name ${name} not found`);
      }
      
      // Save the updated list
      const content = updatedIntegrations.map(i => JSON.stringify(i)).join('\n');
      
      // Write to R2
      await this.r2.put(this.r2Key, content);
    } catch (error) {
      console.error('Error deleting integration from R2:', error);
      throw error;
    }
  }
}
