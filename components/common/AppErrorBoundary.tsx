import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { trackError } from "@/utils/analytics";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

function ErrorFallback(): JSX.Element {
  return (
    <View style={styles.root}>
      <Text variant="headlineSmall" style={styles.heading}>
        Something went wrong
      </Text>
      <Text variant="bodyMedium" style={styles.body}>
        Please restart the app and try again.
      </Text>
    </View>
  );
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    void error;
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    trackError(error, {
      surface: "app_error_boundary",
      componentStack: info.componentStack,
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  heading: {
    textAlign: "center",
  },
  body: {
    textAlign: "center",
  },
});
