/**
 * Fixed blob background — stays pinned to the viewport (no scroll parallax).
 */
export default function SceneParallax({ children }) {
  return (
    <div className="scene" aria-hidden="true">
      {children}
    </div>
  );
}
