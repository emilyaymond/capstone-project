// healthvis-mobile/features/summary/components/SummaryStateGate.tsx
import React from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { AccessibleButton } from "@/components/AccessibleButton";

type FontSize = {
  heading: number;
  body: number;
  label: number;
};

type Props = {
  isLoading: boolean;
  error: any;
  hasAnyData: boolean;
  permissions: any;
  fontSize: FontSize;
  onRetry: () => void;
  onRefresh: () => void;
  children: React.ReactNode;
};

export function SummaryStateGate({
  isLoading,
  error,
  hasAnyData,
  permissions,
  fontSize,
  onRetry,
  onRefresh,
  children,
}: Props) {
  // Loading (no cached data)
  if (isLoading && !hasAnyData) {
    return (
      <ThemedView style={styles.container}>
        <LoadingIndicator
          message="Loading health data..."
          timeout={15000}
          onTimeout={() => {}}
        />
      </ThemedView>
    );
  }

  // Error (no cached data)
  if (error && !hasAnyData) {
    const isPermissionError =
      String(error?.message || "")
        .toLowerCase()
        .includes("permission") ||
      String(error?.message || "").toLowerCase().includes("denied") ||
      String(error?.message || "").toLowerCase().includes("healthkit");

    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ErrorDisplay error={error} errorType="network" onRetry={onRetry} onDismiss={() => {}} />

          {isPermissionError && permissions && (
            <View style={styles.permissionErrorContainer}>
              <ThemedText style={[styles.permissionErrorTitle, { fontSize: fontSize.body }]}>
                Unavailable Categories:
              </ThemedText>

              {permissions?.categoryStatus &&
                Object.entries(permissions.categoryStatus).map(([k, v]: any) =>
                  v ? null : (
                    <ThemedText key={k} style={[styles.permissionErrorItem, { fontSize: fontSize.label }]}>
                      ✗ {String(k)}
                    </ThemedText>
                  )
                )}

              <AccessibleButton
                onPress={() => Linking.openSettings()}
                label="Open iOS Settings"
                hint="Open iOS Settings to grant HealthKit permissions"
                variant="primary"
                style={styles.settingsButton}
              />
            </View>
          )}
        </View>
      </ThemedView>
    );
  }

  // Empty state
  if (!hasAnyData) {
    const needsPermissions = permissions && !permissions.allGranted;

    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        >
          <View style={styles.centerContent}>
            <ThemedText type="title" style={[styles.emptyTitle, { fontSize: fontSize.heading }]}>
              {needsPermissions ? "HealthKit Permissions Needed" : "No Health Data"}
            </ThemedText>

            <ThemedText style={[styles.emptyMessage, { fontSize: fontSize.body }]}>
              {needsPermissions
                ? "Grant HealthKit permissions to view your comprehensive health data."
                : "No health data available yet. Pull down to refresh."}
            </ThemedText>

            {needsPermissions && (
              <AccessibleButton
                onPress={onRetry}
                label="Grant Permissions"
                hint="Request HealthKit permissions to access your health data"
                variant="primary"
                style={styles.permissionButton}
              />
            )}

            <ThemedText style={[styles.emptyHint, { fontSize: fontSize.label }]}>
              Pull down to refresh
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyTitle: { textAlign: "center", marginBottom: 12 },
  emptyMessage: { textAlign: "center", opacity: 0.8, marginBottom: 16 },
  emptyHint: { opacity: 0.6, marginTop: 12 },
  permissionButton: { marginTop: 8 },

  permissionErrorContainer: { marginTop: 16, width: "100%" },
  permissionErrorTitle: { fontWeight: "700", marginBottom: 8 },
  permissionErrorItem: { marginVertical: 2, opacity: 0.9 },
  settingsButton: { marginTop: 12 },
});
