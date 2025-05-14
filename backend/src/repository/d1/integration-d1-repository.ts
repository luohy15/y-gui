import { IntegrationConfig, IntegrationRepository } from '../../../../shared/types';

export class IntegrationD1Repository implements IntegrationRepository {
  private userPrefix: string;

  constructor(private db: D1Database, userPrefix?: string) {
    this.userPrefix = userPrefix || 'default';
  }

  /**
   * Initialize the database schema if it doesn't exist
   */
  async initSchema(): Promise<void> {
    await this.db.exec(`CREATE TABLE IF NOT EXISTS integration (user_prefix TEXT NOT NULL, name TEXT NOT NULL, json_content TEXT NOT NULL, UNIQUE(user_prefix, name));`);
  }

  async getIntegrations(): Promise<IntegrationConfig[]> {
    try {
      await this.initSchema();
      
      // Get all integrations for this user prefix
      const results = await this.db.prepare(`
        SELECT json_content
        FROM integration
        WHERE user_prefix = ?
      `)
      .bind(this.userPrefix)
      .all<{ json_content: string }>();
      
      if (!results || !results.results) {
        return [];
      }
      
      // Parse the results into IntegrationConfig objects
      const integrations: IntegrationConfig[] = results.results.map(row => {
        return JSON.parse(row.json_content);
      });
      
      return integrations;
    } catch (error) {
      console.error('Error fetching integrations from D1:', error);
      return [];
    }
  }

  async addIntegration(integration: IntegrationConfig): Promise<void> {
    try {
      await this.initSchema();
      
      // Insert the integration
      await this.db.prepare(`
        INSERT INTO integration (user_prefix, name, json_content)
        VALUES (?, ?, ?)
      `)
      .bind(this.userPrefix, integration.name, JSON.stringify(integration))
      .run();
    } catch (error) {
      console.error('Error adding integration to D1:', error);
      throw error;
    }
  }

  async updateIntegration(name: string, updatedIntegration: IntegrationConfig): Promise<void> {
    try {
      await this.initSchema();
      
      // Update the integration
      const result = await this.db.prepare(`
        UPDATE integration 
        SET json_content = ?
        WHERE user_prefix = ? AND name = ?
      `)
      .bind(JSON.stringify(updatedIntegration), this.userPrefix, name)
      .run();
      
      if (!result || result.meta.changes === 0) {
        throw new Error(`Integration with name ${name} not found`);
      }
    } catch (error) {
      console.error('Error updating integration in D1:', error);
      throw error;
    }
  }

  async deleteIntegration(name: string): Promise<void> {
    try {
      await this.initSchema();
      
      // Delete the integration
      const result = await this.db.prepare(`
        DELETE FROM integration
        WHERE user_prefix = ? AND name = ?
      `)
      .bind(this.userPrefix, name)
      .run();
      
      if (!result || result.meta.changes === 0) {
        throw new Error(`Integration with name ${name} not found`);
      }
    } catch (error) {
      console.error('Error deleting integration from D1:', error);
      throw error;
    }
  }
}
