import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { useHaptics } from '../hooks/useHaptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { triggerLight } = useHaptics();

  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        // Add a soft haptic feedback when pressing down on the tabs.
        triggerLight();
        props.onPressIn?.(ev);
      }}
    />
  );
}
