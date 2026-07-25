import type { GeneratedRecipe } from './claude';
import { supabase } from './web/supabaseClient';

export type { GeneratedRecipe };

export class ClaudeServiceError extends Error {}

async function invokeGenerateRecipe(body: Record<string, unknown>): Promise<GeneratedRecipe> {
  const { data, error } = await supabase.functions.invoke('generate-recipe', { body });

  if (error) {
    let message = error.message;
    try {
      const errBody = await (error as { context?: Response }).context?.json();
      if (errBody?.error) message = errBody.error;
    } catch {
      // レスポンス本文が読めない場合はデフォルトのエラーメッセージのまま
    }
    throw new ClaudeServiceError(message);
  }

  return data as GeneratedRecipe;
}

export async function generateRecipe(params: {
  availableIngredients: string[];
  defaultSeasonings: string[];
  requestNote: string;
}): Promise<GeneratedRecipe> {
  return invokeGenerateRecipe(params);
}

// ブラウザから直接fetchすると外部サイトのCORSに阻まれるため、
// Supabase Edge Function(generate-recipe)にURLを渡してサーバー側でfetchしてもらう。
export async function importRecipeFromUrl(url: string): Promise<GeneratedRecipe> {
  return invokeGenerateRecipe({ importUrl: url });
}
