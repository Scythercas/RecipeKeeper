import type { GeneratedRecipe } from './claude';
import { supabase } from './web/supabaseClient';

export type { GeneratedRecipe };

export class ClaudeServiceError extends Error {}

export async function generateRecipe(params: {
  availableIngredients: string[];
  defaultSeasonings: string[];
  requestNote: string;
}): Promise<GeneratedRecipe> {
  const { data, error } = await supabase.functions.invoke('generate-recipe', {
    body: params,
  });

  if (error) {
    let message = error.message;
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      // レスポンス本文が読めない場合はデフォルトのエラーメッセージのまま
    }
    throw new ClaudeServiceError(message);
  }

  return data as GeneratedRecipe;
}
