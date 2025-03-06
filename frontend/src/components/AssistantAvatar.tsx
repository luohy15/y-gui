import React from 'react';

interface AssistantAvatarProps {
  model?: string;
  className?: string;
}

export default function AssistantAvatar({ model, className = "h-10 w-10" }: AssistantAvatarProps) {
  const getIconSlug = (model?: string) => {
    if (!model) return 'google';
    const modelLower = model.toLowerCase();
    if (modelLower.includes('claude')) return 'claude';
    if (modelLower.includes('gemini')) return 'gemini';
    if (modelLower.includes('deepseek')) return 'deepseek';
    return 'google';
  };

  return (
    <div className={`${className} rounded-full flex items-center justify-center shadow-sm overflow-hidden bg-white dark:bg-gray-800`}>
      <img
        src={`https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${getIconSlug(model)}-color.svg`}
        className="w-6 h-6"
        alt={`${getIconSlug(model)} icon`}
      />
    </div>
  );
}
