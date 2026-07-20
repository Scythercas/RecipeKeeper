// このファイル自体はexpo-routerのルート探索でネイティブ向けバンドルにも取り込まれ得るため、
// supabase等Web専用コードへの静的importを一切置かず、React.lazyの遅延importに閉じ込める。
// (通常のsrc/配下のモジュール分割と違い、app/直下のファイルはプラットフォームに関わらず
//  参照されることがあるため、ここだけは意図的にこのパターンを使う)
import React, { Suspense } from 'react';

import LoadingScreen from '../src/web/LoadingScreen';

const WebRootLayout = React.lazy(() => import('../src/web/WebRootLayout'));

export default function RootLayoutWebEntry() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <WebRootLayout />
    </Suspense>
  );
}
