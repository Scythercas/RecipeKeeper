export const GENRES = [
  '和食',
  '洋食',
  '中華',
  '韓国',
  'エスニック',
  'イタリアン',
  'デザート',
  'その他',
] as const;

export type CookLog = {
  id: string;
  date: string; // ISO 8601
  tweak: string;
};

export type Recipe = {
  id: string;
  title: string;
  genre: string; // GENRESのいずれか、または自由入力(AI生成・過去データ互換のため)
  sourceURL: string;
  ingredients: string[];
  seasonings: string[];
  steps: string[];
  memo: string;
  isAIGenerated: boolean;
  createdAt: string; // ISO 8601
  dishPhotos: string[]; // ローカルファイルURI
  handwrittenPhotos: string[]; // ローカルファイルURI
  cookLogs: CookLog[];
  rating: number | null; // 10点満点の採点。未評価はnull
};

export function cookCount(recipe: Recipe): number {
  return recipe.cookLogs.length;
}

export function lastCooked(recipe: Recipe): string | null {
  if (recipe.cookLogs.length === 0) return null;
  return recipe.cookLogs.reduce((max, log) => (log.date > max ? log.date : max), recipe.cookLogs[0].date);
}

export type NewRecipeInput = Omit<Recipe, 'id' | 'createdAt' | 'cookLogs'>;
