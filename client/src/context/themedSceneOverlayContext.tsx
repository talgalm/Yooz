import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

export const ThemedSceneOverlayContext = createContext<Dispatch<SetStateAction<ReactNode | null>> | null>(
  null,
);

export function useThemedSceneOverlaySetter() {
  return useContext(ThemedSceneOverlayContext);
}
