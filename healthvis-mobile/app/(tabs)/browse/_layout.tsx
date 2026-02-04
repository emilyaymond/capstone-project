import { Stack } from "expo-router";
import React from "react";

export default function BrowseLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, 
      }}
    />
  );
}