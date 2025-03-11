import React from 'react';
import Logo from './Logo';

interface AssistantAvatarProps {
  model?: string;
  className?: string;
}

export default function AssistantAvatar({ model, className = "h-10 w-10" }: AssistantAvatarProps) {
  // Only use model-specific icons if a model is provided
  if (model) {
    const getIconSlug = (model: string) => {
      const modelLower = model.toLowerCase();
      if (modelLower.includes('claude')) return 'claude-color';
      if (modelLower.includes('gemini')) return 'gemini-color';
      if (modelLower.includes('deepseek')) return 'deepseek-color';
      return 'openai';
    };

    return (
      <div className={`${className} rounded-full flex items-center justify-center shadow-sm overflow-hidden bg-white dark:bg-gray-800`}>
        <img
          src={`https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${getIconSlug(model)}.svg`}
          className="w-6 h-6"
          alt={`${getIconSlug(model)} icon`}
        />
      </div>
    );
  }

  // Use Logo component as default avatar when no model is specified
  return <Logo className={className} />;
}
