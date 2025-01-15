import axios from 'axios';
import { renderTemplate } from '../helpers/utils';

interface OllamaConfig {
  apiUrl: string;
  modelName: string;
  prompt: string;
}

export default async function translateWithOllama(
  text: string,
  config: OllamaConfig,
  sourceLanguage: string,
  targetLanguage: string
) {
  const { apiUrl, modelName, prompt } = config;

  const renderedPrompt = renderTemplate(prompt, {
    sourceLanguage,
    targetLanguage,
    content: text
  });

  try {
    const response = await axios.post(`${apiUrl}/api/generate`, {
      model: modelName,
      prompt: renderedPrompt,
      stream: false
    });

    if (response.data && response.data.response) {
      return response.data.response.trim();
    } else {
      throw new Error(response?.data?.error || 'Unexpected response from Ollama');
    }
  } catch (error) {
    throw error;
  }
}