// supabase等への静的importを避けるためReact.lazyで遅延読み込みする(app/_layout.web.tsxと同じ理由)
import React, { Suspense } from 'react';

import LoadingScreen from '../src/web/LoadingScreen';

const ForgotPasswordScreen = React.lazy(() => import('../src/web/screens/ForgotPasswordScreen'));

export default function ForgotPasswordRoute() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ForgotPasswordScreen />
    </Suspense>
  );
}
