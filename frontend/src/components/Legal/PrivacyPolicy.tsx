import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const PrivacyPolicy: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-4xl mx-auto px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <strong>Effective Date:</strong> July 12, 2025<br />
            <strong>Last Updated:</strong> July 12, 2025
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              This Privacy Policy explains how yovy.app ("we," "us," or "our") collects, uses, and protects your information when you use our Service. We are committed to protecting your privacy and ensuring the security of your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">2.1 Account Information</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Authentication data through Auth0 and Google OAuth</li>
                  <li>• Email address and profile information from your authentication provider</li>
                  <li>• Account preferences and settings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">2.2 Chat Data</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Messages and conversations you have with AI models</li>
                  <li>• Chat history and timestamps</li>
                  <li>• Bot configurations and preferences</li>
                  <li>• MCP server configurations</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">2.3 Usage Information</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Service usage patterns and analytics</li>
                  <li>• Error logs and diagnostic information</li>
                  <li>• Feature usage statistics (anonymized)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">2.4 Integration Data</h3>
                <p className={`leading-relaxed mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  When you enable MCP integrations (Gmail, Google Calendar, etc.), we may access:
                </p>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Email data (if Gmail integration is enabled)</li>
                  <li>• Calendar data (if Google Calendar integration is enabled)</li>
                  <li>• Other data as specifically authorized by you for each integration</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">3.1 Service Provision</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• To provide and maintain the AI chat interface</li>
                  <li>• To enable MCP integrations you've authorized</li>
                  <li>• To synchronize your data across devices</li>
                  <li>• To remember your preferences and settings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">3.2 Service Improvement</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• To analyze usage patterns (using anonymized data)</li>
                  <li>• To improve AI model performance and accuracy</li>
                  <li>• To enhance user experience and interface design</li>
                  <li>• To develop new features and capabilities</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">3.3 Security and Compliance</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• To detect and prevent fraud or abuse</li>
                  <li>• To comply with legal obligations</li>
                  <li>• To protect the rights and safety of users</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">4.1 Storage</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Chat data is stored in Cloudflare D1 database</li>
                  <li>• Bot and MCP server configurations are stored in Cloudflare D1</li>
                  <li>• All data is encrypted in transit and at rest</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">4.2 Security Measures</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• We implement industry-standard security practices</li>
                  <li>• Access to your data is restricted to authorized systems only</li>
                  <li>• We regularly audit our security measures</li>
                  <li>• We use secure authentication through Auth0</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">4.3 Data Retention</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Chat data is retained indefinitely to provide sync functionality across devices</li>
                  <li>• Account data is retained while your account remains active</li>
                  <li>• Data may be retained for legal and operational purposes</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Integrations</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">5.1 AI Model Providers</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• Your chat messages are sent to third-party AI providers to generate responses</li>
                  <li>• We select providers that have appropriate data protection measures</li>
                  <li>• We do not control how AI providers handle your data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">5.2 MCP Servers</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• MCP integrations access third-party services (Gmail, Google Calendar, etc.)</li>
                  <li>• You explicitly authorize each integration and its permissions</li>
                  <li>• We do not store your credentials for these services</li>
                  <li>• Access can be revoked at any time through your account settings</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">5.3 Authentication</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• We use Auth0 and Google OAuth for authentication</li>
                  <li>• These providers have their own privacy policies</li>
                  <li>• We only receive necessary authentication information</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Sharing</h2>
            <p className={`leading-relaxed mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              We do not sell, trade, or rent your personal information to third parties. We may share information only in these specific circumstances:
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">6.1 With Your Consent</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• When you explicitly authorize data sharing</li>
                  <li>• For integrations you've enabled</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">6.2 Legal Requirements</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• To comply with legal obligations</li>
                  <li>• To respond to lawful requests from authorities</li>
                  <li>• To protect our rights and prevent fraud</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">6.3 Service Providers</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• With trusted service providers who help operate the Service</li>
                  <li>• Only for the specific purposes outlined in this policy</li>
                  <li>• Under strict confidentiality agreements</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights and Choices</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">7.1 Access and Control</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• You can view your profile information</li>
                  <li>• You can disable or remove MCP integrations</li>
                  <li>• You can contact us to request data deletion</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">7.2 Data Access</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• You can view your chat history through the interface</li>
                  <li>• You can request a copy of your personal information by contacting us</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">7.3 Communication Preferences</h3>
                <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <li>• You can opt out of non-essential communications</li>
                  <li>• You can manage notification settings</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              The Service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will delete the information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. International Data Transfers</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Your data may be processed and stored in countries other than your own. We ensure appropriate safeguards are in place for international transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              We may update this Privacy Policy from time to time. We will notify you of significant changes through the Service or via email. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className={`leading-relaxed mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              If you have questions about this Privacy Policy or want to exercise your rights, please contact us:
            </p>
            <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• <strong>Email:</strong> <a href="mailto:luohycs@gmail.com" className="text-blue-500 hover:text-blue-400">luohycs@gmail.com</a></li>
              <li>• Through the Service interface</li>
              <li>• At the contact information provided on our website</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Cookie Policy</h2>
            <p className={`leading-relaxed mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              We use cookies and similar technologies to:
            </p>
            <ul className={`space-y-1 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• Maintain your login session</li>
              <li>• Remember your preferences</li>
              <li>• Analyze Service usage (anonymized)</li>
              <li>• Improve Service performance</li>
            </ul>
            <p className={`leading-relaxed mt-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              You can control cookie settings through your browser, though this may affect Service functionality.
            </p>
          </section>

          <div className={`mt-12 pt-8 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong>Data Controller Information:</strong><br />
              For users in the EU/UK, we act as the data controller for your personal information. You have additional rights under GDPR/UK GDPR, including the right to request deletion, object to processing, and lodge complaints with supervisory authorities. Please note that some features (like self-service data deletion and export) are not currently available through the interface but can be requested by contacting us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;