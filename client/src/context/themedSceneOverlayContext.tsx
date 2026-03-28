import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';

/** Setter for a node painted above the themed scene SVG and under the activity content layer. */
export const ThemedSceneOverlayContext = createContext<Dispatch<SetStateAction<ReactNode | null>> | null>(
  null,
);

export function useThemedSceneOverlaySetter() {
  return useContext(ThemedSceneOverlayContext);
}
