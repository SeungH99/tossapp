import { expect, type Locator, type Page } from "@playwright/test";

const intentionalHorizontalScrollerAllowlist: string[] = [];

export async function applyTextScale(page: Page, scale = 2): Promise<void> {
  await page.evaluate((requestedScale) => {
    interface TextScaleState {
      baselinePx: number;
      inlinePriority: string;
      inlineValue: string;
    }

    const stateWindow = window as Window & {
      __e9TextScaleStates?: WeakMap<HTMLElement, TextScaleState>;
    };
    const states =
      stateWindow.__e9TextScaleStates ??
      new WeakMap<HTMLElement, TextScaleState>();
    stateWindow.__e9TextScaleStates = states;
    const elements = [
      document.documentElement,
      document.body,
      ...document.querySelectorAll<HTMLElement>("body *"),
    ];

    elements.forEach((element) => {
      const state = states.get(element);
      if (state == null) {
        states.set(element, {
          baselinePx: 0,
          inlinePriority: element.style.getPropertyPriority("font-size"),
          inlineValue: element.style.getPropertyValue("font-size"),
        });
        return;
      }
      if (state.inlineValue === "") {
        element.style.removeProperty("font-size");
      } else {
        element.style.setProperty(
          "font-size",
          state.inlineValue,
          state.inlinePriority,
        );
      }
    });

    const sizes = elements.map((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach((element, index) => {
      const state = states.get(element);
      if (state != null) {
        state.baselinePx = sizes[index];
      }
      element.style.setProperty(
        "font-size",
        `${sizes[index] * requestedScale}px`,
        "important",
      );
    });
  }, scale);
}

export async function expectAppliedTextScale(
  target: Locator,
  scale = 2,
): Promise<void> {
  const measurement = await target.evaluate((element) => {
    interface TextScaleState {
      baselinePx: number;
    }

    const states = (
      window as Window & {
        __e9TextScaleStates?: WeakMap<HTMLElement, TextScaleState>;
      }
    ).__e9TextScaleStates;
    return {
      actualPx: Number.parseFloat(getComputedStyle(element).fontSize),
      baselinePx: states?.get(element as HTMLElement)?.baselinePx ?? null,
    };
  });

  expect(
    measurement.baselinePx,
    "applyTextScale must record the unscaled computed font size",
  ).not.toBeNull();
  expect(measurement.actualPx).toBeCloseTo(
    (measurement.baselinePx as number) * scale,
    1,
  );
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(
    ({ allowlist, tolerance }) => {
      const elements = [
        document.documentElement,
        document.body,
        ...document.querySelectorAll<HTMLElement>("body *"),
      ];
      const describe = (element: HTMLElement) => {
        if (element.id !== "") {
          return `#${element.id}`;
        }
        const className = element.getAttribute("class") ?? "";
        if (className !== "") {
          return `${element.tagName.toLocaleLowerCase("en-US")}.${className
            .trim()
            .split(/\s+/)
            .join(".")}`;
        }
        return element.tagName.toLocaleLowerCase("en-US");
      };
      const isVisible = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const isAllowlisted = (element: HTMLElement) =>
        allowlist.some((selector) => element.matches(selector));
      const hasOwnText = (element: HTMLElement) =>
        [...element.childNodes].some(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent?.trim().length ?? 0) > 0,
        );
      const visibleElements = elements.filter(isVisible);
      const visibleTextElements = visibleElements.filter(hasOwnText);

      const viewportOffenders = visibleTextElements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            selector: describe(element),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
          };
        })
        .filter(
          ({ left, right }) =>
            left < -tolerance || right > window.innerWidth + tolerance,
        );
      const contentWidthOffenders = visibleTextElements
        .filter(
          (element) =>
            !isAllowlisted(element) &&
            element.clientWidth > 0 &&
            element.scrollWidth > element.clientWidth + tolerance,
        )
        .map((element) => ({
          selector: describe(element),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
      const clipOffenders = visibleElements
        .filter((element) => {
          const overflowX = getComputedStyle(element).overflowX;
          return (
            !isAllowlisted(element) &&
            (overflowX === "hidden" || overflowX === "clip")
          );
        })
        .flatMap((container) => {
          const containerRect = container.getBoundingClientRect();
          const clippedChildren = [
            ...container.querySelectorAll<HTMLElement>("*"),
          ]
            .filter(isVisible)
            .map((child) => {
              const childRect = child.getBoundingClientRect();
              return {
                selector: describe(child),
                left: Math.round(childRect.left),
                right: Math.round(childRect.right),
              };
            })
            .filter(
              ({ left, right }) =>
                left < containerRect.left - tolerance ||
                right > containerRect.right + tolerance,
            );
          if (
            container.scrollWidth <= container.clientWidth + tolerance &&
            clippedChildren.length === 0
          ) {
            return [];
          }
          return [
            {
              selector: describe(container),
              clientWidth: container.clientWidth,
              scrollWidth: container.scrollWidth,
              clippedChildren,
            },
          ];
        });

      return {
        clipOffenders,
        contentWidthOffenders,
        scrollWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        viewportOffenders,
        viewportWidth: window.innerWidth,
      };
    },
    {
      allowlist: intentionalHorizontalScrollerAllowlist,
      tolerance: 1,
    },
  );

  expect(result.viewportOffenders, JSON.stringify(result, null, 2)).toEqual([]);
  expect(result.contentWidthOffenders, JSON.stringify(result, null, 2)).toEqual(
    [],
  );
  expect(result.clipOffenders, JSON.stringify(result, null, 2)).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth + 1);
}
