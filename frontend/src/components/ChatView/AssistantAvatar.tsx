import React from 'react';
import Logo, { ClaudeLogo, GeminiLogo, DeepseekLogo } from '../Logo';

interface AssistantAvatarProps {
  model?: string;
  className?: string;
}

export default function AssistantAvatar({ model, className = "h-10 w-10" }: AssistantAvatarProps) {
  // Only use model-specific icons if a model is provided
  if (model) {
    const modelLower = model.toLowerCase();

    if (modelLower.includes('claude')) {
      return <ClaudeLogo className={className} />;
    }

    if (modelLower.includes('gemini')) {
      return <GeminiLogo className={className} />;
    }

    if (modelLower.includes('deepseek')) {
      return <DeepseekLogo className={className} />;
    }
  }

  // Use Logo component as default avatar when no model is specified
  return <Logo className={className} />;
}
