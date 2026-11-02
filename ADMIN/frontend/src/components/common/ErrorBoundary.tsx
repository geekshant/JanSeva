import { Component, type ReactNode } from 'react';
import i18n from '@/i18n/config';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold">{i18n.t('common.somethingWentWrong')}</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.error?.message ?? i18n.t('common.unexpectedError')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {i18n.t('common.reloadPage')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
