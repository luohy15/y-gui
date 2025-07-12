import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const TermsOfService: React.FC = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <div className="max-w-4xl mx-auto px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <strong>Effective Date:</strong> July 12, 2025<br />
            <strong>Last Updated:</strong> July 12, 2025
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              By accessing or using yovy.app ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              yovy.app is a web-based graphical interface for AI chat interactions that supports multiple AI models and MCP (Model Context Protocol) integrations, including Gmail, Google Calendar, and image generation capabilities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts and Authentication</h2>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• You must provide accurate and complete information when creating an account</li>
              <li>• You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>• You are responsible for all activities that occur under your account</li>
              <li>• We use Auth0 and Google authentication for secure login</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className={`leading-relaxed mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>You agree not to:</p>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• Use the Service for any illegal or unauthorized purpose</li>
              <li>• Violate any laws or regulations in your use of the Service</li>
              <li>• Upload, transmit, or share content that is harmful, offensive, or violates others' rights</li>
              <li>• Attempt to gain unauthorized access to the Service or its systems</li>
              <li>• Use the Service to generate malicious content or engage in harmful activities</li>
              <li>• Interfere with or disrupt the Service's operation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. AI Model Usage</h2>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• The Service integrates with third-party AI providers</li>
              <li>• You are responsible for your interactions with AI models</li>
              <li>• We do not guarantee the accuracy, completeness, or reliability of AI-generated content</li>
              <li>• You acknowledge that AI responses may contain errors or biases</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. MCP Integrations</h2>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• MCP server integrations (Gmail, Google Calendar, etc.) require your explicit consent</li>
              <li>• You control which integrations you enable and their access permissions</li>
              <li>• We are not responsible for the functionality or availability of third-party MCP servers</li>
              <li>• You are responsible for maintaining the security of your integration credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Privacy and Data</h2>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• Your use of the Service is subject to our Privacy Policy</li>
              <li>• Chat data is stored in Cloudflare D1 for functionality and sync purposes</li>
              <li>• You retain ownership of your content and data</li>
              <li>• We may use anonymized data to improve the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• The Service and its content are protected by intellectual property laws</li>
              <li>• You retain rights to your input content</li>
              <li>• You grant us a limited license to use your content to provide the Service</li>
              <li>• You must respect the intellectual property rights of others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Service Availability</h2>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• We strive to maintain Service availability but do not guarantee uninterrupted access</li>
              <li>• We may modify, suspend, or discontinue the Service at any time</li>
              <li>• We are not liable for any Service downtime or unavailability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <div className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p className="font-medium mb-2">TO THE MAXIMUM EXTENT PERMITTED BY LAW:</p>
              <ul className="space-y-2">
                <li>• THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND</li>
                <li>• WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES</li>
                <li>• OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID FOR THE SERVICE</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
            <ul className={`space-y-2 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>• Either party may terminate this agreement at any time</li>
              <li>• We may suspend or terminate your account for violations of these Terms</li>
              <li>• Upon termination, your right to use the Service ceases immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              These Terms are governed by the laws of the jurisdiction where the Service is operated, without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Changes to Terms</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Contact Information</h2>
            <p className={`leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              If you have questions about these Terms, please contact us through the Service or at the contact information provided on our website.
            </p>
          </section>

          <div className={`mt-12 pt-8 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm italic ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong>Note:</strong> These Terms of Service are designed to protect both users and the service provider. Please read them carefully and contact us if you have any questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;