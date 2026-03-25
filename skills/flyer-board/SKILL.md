---
name: flyer-board
description: >
  FlyerBoard management for CavesApp - digital board canvas with flyers.
  Handles flyer sizing, positioning, aspect ratios, and responsive behavior.
  Trigger: When working with FlyerBoard, flyer cards, canvas layout, or flyer positioning.
license: Apache-2.0
metadata:
  author: cavesapp
  version: "1.0"
---

## When to Use

- Working with FlyerBoard canvas components
- Adjusting flyer card sizes or aspect ratios
- Modifying flyer positioning or layout algorithm
- Adding responsive behavior to flyers
- Working with flyer animations or interactions

## Critical Patterns

### Flyer Aspect Ratio

Flyers MUST maintain a **portrait aspect ratio** (taller than wide).

| Platform | Width | Height | Ratio |
|----------|-------|--------|-------|
| Mobile   | 120px | 180px  | 2:3   |
| Desktop  | 180px | 270px  | 2:3   |

### Breakpoints

| Breakpoint | Max Width | Flyer Size |
|------------|-----------|------------|
| Mobile     | < 768px   | 120x180    |
| Desktop    | >= 768px  | 180x270    |

### Design Tokens

```typescript
// src/features/feed/constants/flyer.ts
export const FLYER_SIZES = {
  mobile: { width: 120, height: 180 },
  desktop: { width: 180, height: 270 },
} as const;

export const FLYER_ASPECT_RATIO = 2 / 3; // width / height
```

### Canvas Layout

| Property | Mobile | Desktop |
|----------|--------|---------|
| Cards per row | 3-4 | 5-6 |
| Gap X | 16px | 24px |
| Gap Y | 24px | 32px |
| Random offset | ±20px | ±30px |
| Random rotation | ±4deg | ±6deg |

## Code Examples

### Flyer Size Hook

```typescript
// src/features/feed/hooks/use-flyer-size.ts
"use client";

import { useState, useEffect } from "react";
import { FLYER_SIZES } from "../constants/flyer";

export function useFlyerSize() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile ? FLYER_SIZES.mobile : FLYER_SIZES.desktop;
}
```

### Responsive Flyer Card

```tsx
<div
  className="relative overflow-hidden rounded-lg"
  style={{
    width: isMobile ? 120 : 180,
    height: isMobile ? 180 : 270,
  }}
>
  <Image
    src={event.flyer_url}
    alt={event.title}
    fill
    className="object-cover"
    sizes={isMobile ? "120px" : "180px"}
  />
</div>
```

### Constants File

```typescript
// src/features/feed/constants/flyer.ts
export const FLYER_SIZES = {
  mobile: { width: 120, height: 180 },
  desktop: { width: 180, height: 270 },
} as const;

export const FLYER_GAP = {
  mobile: { x: 16, y: 24 },
  desktop: { x: 24, y: 32 },
} as const;

export const FLYER_OFFSET = {
  mobile: { x: 20, y: 15 },
  desktop: { x: 30, y: 20 },
} as const;

export const FLYER_ROTATION = {
  mobile: 4,  // degrees
  desktop: 6,
} as const;

export const CARDS_PER_ROW = {
  mobile: 4,
  desktop: 6,
} as const;
```

## Commands

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit

# Dev server
npm run dev
```

## Resources

- **FlyerBoard Canvas**: `src/features/feed/components/flyer-board-canvas.tsx`
- **FlyerBoard Item**: `src/features/feed/components/flyer-board-item.tsx`
- **Canvas Hook**: `src/features/feed/hooks/use-canvas.ts`
