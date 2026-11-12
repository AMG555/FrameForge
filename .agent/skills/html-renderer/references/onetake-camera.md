# OneTake Continuous Camera Choreography

Derived from `feitangyuan/onetake`. Eliminates abrupt black cuts, slideshow jumps, and disconnected slide transitions.

---

## The OneTake Principle

In standard presentation videos, scene transitions cut to black or snap immediately between unrelated slide geometries. In **OneTake**, the entire video occurs within a single, continuous, unified spatial universe:

$$\text{Camera}(t) = \text{Spline}(\mathbf{P}_0, \mathbf{P}_1, \dots, \mathbf{P}_N, t)$$

Every scene's starting camera transform $(\mathbf{x}, \mathbf{y}, \text{zoom})$ is identically anchored to the previous scene's terminating transform.

---

## 1. Unified Spatial Canvas

Instead of unmounting and mounting DOM elements per scene, the entire video timeline exists on a 2.5D coordinate plane:

- **Scene 1 (Hook)**: Positioned at $(0, 0)$, Zoom $= 1.0$
- **Scene 2 (Mechanism)**: Positioned at $(1920, 0)$, Zoom $= 1.15$
- **Scene 3 (Zoom Detail)**: Positioned at $(1920, 400)$, Zoom $= 1.80$
- **Scene 4 (Wide Resolution)**: Positioned at $(960, 200)$, Zoom $= 0.85$

---

## 2. Spring-Interpolated Camera Navigation

When moving from Scene $k$ to Scene $k+1$:
1. **Never use linear interpolation**.
2. **Use underdamped spring physics** with slight overshoot:
   - Tension: `140`
   - Friction: `14`
3. **Camera Lead / Look-Ahead**:
   $$\text{CameraTarget}(t) = \text{SubjectPos}(t) + \mathbf{v}_{\text{subject}} \times 0.25$$

---

## 3. Depth-Parallax Layering

During continuous camera travel, layers shift at varying rates proportional to depth $z$:

| Layer | Depth $z$ | Parallax Factor | Visual Content |
|---|---|---|---|
| Background Grid | $z = 0.2$ | $0.2 \times \Delta x$ | Blueprint grid, starfield, faint topographical lines |
| Middle Ground | $z = 0.6$ | $0.6 \times \Delta x$ | Secondary cards, connecting vector pipes, data nodes |
| Primary Stage | $z = 1.0$ | $1.0 \times \Delta x$ | Main subject, active text card, character avatar |
| Foreground Overlay | $z = 1.4$ | $1.4 \times \Delta x$ | Lens vignette, framing pillars, floating particles |

---

## 4. Zero-Cut Scene Handshake Contract

When transitioning between narrative beats:
- The outgoing scene subject smoothly settles into a secondary supporting node (e.g., shifts left to $x = 300\text{px}$ and scales down to $0.65$).
- The incoming scene subject enters from depth ($z = 0.5 \to 1.0$) rather than snapping onto the screen.
- A whoosh sound effect from `Leonxlnx/earshot` fires at the exact inflection point of peak camera velocity.

