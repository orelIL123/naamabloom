import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error, resetError: () => void}>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Enhanced error logging with more context
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'React Native',
      isPreview: typeof window !== 'undefined' && __DEV__
    };
    
    if (__DEV__) {
      console.warn('🚨 Error Boundary Details (DEV):', errorDetails);
      console.group('🔍 Debugging Information');
      console.log('Error Message:', error.message);
      console.log('Stack Trace:', error.stack);
      console.log('Component Stack:', errorInfo.componentStack);
      console.log('Is Preview Mode:', errorDetails.isPreview);
      console.groupEnd();
    } else {
      // In production, we could send this to crash analytics
      console.error('Production Error:', errorDetails);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>משהו השתבש</Text>
          <Text style={styles.message}>
            אירעה שגיאה באפליקציה. אנא נסה שוב.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>נסה שוב</Text>
          </TouchableOpacity>
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={[styles.errorText, { fontWeight: 'bold', marginBottom: 8 }]}>
                שגיאה טכנית (מצב פיתוח):
              </Text>
              <Text style={styles.errorText}>
                {this.state.error.message}
              </Text>
              {this.state.error.stack && (
                <Text style={[styles.errorText, { fontSize: 10, marginTop: 8 }]}>
                  Stack: {this.state.error.stack.substring(0, 200)}...
                </Text>
              )}
              <Text style={[styles.errorText, { marginTop: 8, fontStyle: 'italic' }]}>
                💡 בדוק את הקונסול לפרטים נוספים
              </Text>
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetails: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;