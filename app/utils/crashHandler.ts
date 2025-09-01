// src/utils/crashHandler.ts
// Global-safe error handling for RN (Hermes) + web, with full guards

let installed = false;

type GlobalHandler = ((error: any, isFatal?: boolean) => void) | undefined;

let prevHandler: GlobalHandler;

/**
 * Install global error handlers safely (idempotent).
 * Does nothing if the required APIs don't exist (prevents Hermes crash).
 */
export function installGlobalErrorHandling() {
  if (installed) return;
  installed = true;

  // RN global ErrorUtils (exists on RN, may be undefined in some envs)
  const EU: any = (globalThis as any).ErrorUtils;

  // Try to capture existing handler if API exists
  if (EU && typeof EU.getGlobalHandler === 'function') {
    try {
      prevHandler = EU.getGlobalHandler();
    } catch {
      // ignore
    }
  }

  // Register only if API exists; otherwise, silently no-op
  if (EU && typeof EU.setGlobalHandler === 'function') {
    try {
      const handler: GlobalHandler = (error, isFatal) => {
        // Enhanced error logging with context
        const errorInfo = {
          error: error?.message || error?.toString() || 'Unknown error',
          isFatal: isFatal,
          stack: error?.stack,
          timestamp: new Date().toISOString(),
        };

        if (__DEV__) {
          console.error('Global Error Handler (DEV):', errorInfo);
        } else {
          console.error('Global Error Handler (PROD):', errorInfo);
          // In production, this could be sent to crash analytics
        }

        // Call previous/original handler if present (keeps red screen in dev / crash reporting in prod)
        if (typeof prevHandler === 'function') {
          try {
            return prevHandler(error, isFatal);
          } catch (handlerError) {
            console.warn('Previous error handler failed:', handlerError);
          }
        }
        // Fallback: do nothing (don't crash app if non-fatal)
      };

      EU.setGlobalHandler(handler);
    } catch {
      // ignore
    }
  }

  // Unhandled promise rejections (guarded)
  try {
    const g: any = globalThis as any;
    if (g.process && typeof g.process.on === 'function') {
      g.process.on('unhandledRejection', (reason: any) => {
        // console.warn('Unhandled Promise Rejection:', reason);
        return true; // prevent crash
      });
    } else if ('onunhandledrejection' in g) {
      // Some RN/web runtimes expose this
      (g as any).onunhandledrejection = (e: any) => {
        // console.warn('Unhandled Rejection:', e?.reason ?? e);
        return true;
      };
    }
  } catch {
    // ignore
  }

  // Web-only guards (won't run on RN)
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    try {
      window.addEventListener('error', (event) => {
        // console.error('Window Error:', event?.error ?? event?.message);
      });
      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        // console.warn('Unhandled Rejection (window):', event.reason);
        event.preventDefault?.();
      });
    } catch {
      // ignore
    }
  }
}

/** Small helpers for safe code paths */
export const crashHandler = {
  handleError(error: unknown, context?: string) {
    const errorInfo = {
      context: context ?? 'Unknown',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };
    
    if (__DEV__) {
      console.error(`Safe Error in ${errorInfo.context}:`, errorInfo);
    } else {
      console.warn(`Safe Error in ${errorInfo.context}:`, errorInfo);
    }
  },
  async safeAsync<T>(fn: () => Promise<T>, fallback?: T, context?: string): Promise<T | undefined> {
    try {
      return await fn();
    } catch (e) {
      crashHandler.handleError(e, context);
      return fallback;
    }
  },
  safe<T>(fn: () => T, fallback?: T, context?: string): T | undefined {
    try {
      return fn();
    } catch (e) {
      crashHandler.handleError(e, context);
      return fallback;
    }
  },
};
