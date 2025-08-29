import { useEffect, useRef, useCallback } from 'react';

interface KeyboardNavigationOptions {
  enableArrowKeys?: boolean;
  enableTabNavigation?: boolean;
  enableEscapeKey?: boolean;
  enableEnterKey?: boolean;
  enableSpaceKey?: boolean;
  enableHomeEndKeys?: boolean;
  enablePageUpDownKeys?: boolean;
  focusableSelectors?: string;
  onFocusChange?: (element: HTMLElement | null) => void;
  onEscape?: () => void;
  onEnter?: (element: HTMLElement) => void;
  onSpace?: (element: HTMLElement) => void;
}

interface FocusableElement {
  element: HTMLElement;
  index: number;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const {
    enableArrowKeys = true,
    enableTabNavigation = true,
    enableEscapeKey = true,
    enableEnterKey = true,
    enableSpaceKey = true,
    enableHomeEndKeys = true,
    enablePageUpDownKeys = true,
    focusableSelectors = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="menuitem"]',
    onFocusChange,
    onEscape,
    onEnter,
    onSpace,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const currentFocusIndex = useRef<number>(0);
  const focusableElements = useRef<FocusableElement[]>([]);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): FocusableElement[] => {
    if (!containerRef.current) return [];

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ).filter((element) => {
      const el = element as HTMLElement;
      return (
        el.offsetParent !== null && // Element is visible
        !('disabled' in el && el.disabled) && // Element is not disabled
        el.style.display !== 'none' && // Element is not hidden
        el.style.visibility !== 'hidden' // Element is not invisible
      );
    }) as HTMLElement[];

    return elements.map((element, index) => ({ element, index }));
  }, [focusableSelectors]);

  // Focus an element by index
  const focusElement = useCallback((index: number) => {
    if (focusableElements.current[index]) {
      focusableElements.current[index].element.focus();
      currentFocusIndex.current = index;
      onFocusChange?.(focusableElements.current[index].element);
    }
  }, [onFocusChange]);

  // Focus the first element
  const focusFirst = useCallback(() => {
    if (focusableElements.current.length > 0) {
      focusElement(0);
    }
  }, [focusElement]);

  // Focus the last element
  const focusLast = useCallback(() => {
    if (focusableElements.current.length > 0) {
      focusElement(focusableElements.current.length - 1);
    }
  }, [focusElement]);

  // Focus the next element
  const focusNext = useCallback(() => {
    if (focusableElements.current.length > 0) {
      const nextIndex = (currentFocusIndex.current + 1) % focusableElements.current.length;
      focusElement(nextIndex);
    }
  }, [focusElement]);

  // Focus the previous element
  const focusPrevious = useCallback(() => {
    if (focusableElements.current.length > 0) {
      const prevIndex = currentFocusIndex.current === 0 
        ? focusableElements.current.length - 1 
        : currentFocusIndex.current - 1;
      focusElement(prevIndex);
    }
  }, [focusElement]);

  // Focus by row (for grid layouts)
  const focusByRow = useCallback((direction: 'up' | 'down', columns: number = 1) => {
    if (focusableElements.current.length === 0 || columns <= 1) return;

    const currentRow = Math.floor(currentFocusIndex.current / columns);
    let targetIndex: number;

    if (direction === 'up') {
      const targetRow = currentRow === 0 ? Math.floor((focusableElements.current.length - 1) / columns) : currentRow - 1;
      targetIndex = Math.min(targetRow * columns + (currentFocusIndex.current % columns), focusableElements.current.length - 1);
    } else {
      const targetRow = (currentRow + 1) % Math.ceil(focusableElements.current.length / columns);
      targetIndex = targetRow * columns + (currentFocusIndex.current % columns);
      if (targetIndex >= focusableElements.current.length) {
        targetIndex = targetIndex % columns;
      }
    }

    focusElement(targetIndex);
  }, [focusElement]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, altKey, metaKey } = event;

    // Don't handle keyboard shortcuts if modifier keys are pressed
    if (ctrlKey || altKey || metaKey) return;

    switch (key) {
      case 'ArrowUp':
        if (enableArrowKeys) {
          event.preventDefault();
          focusByRow('up');
        }
        break;

      case 'ArrowDown':
        if (enableArrowKeys) {
          event.preventDefault();
          focusByRow('down');
        }
        break;

      case 'ArrowLeft':
        if (enableArrowKeys) {
          event.preventDefault();
          focusPrevious();
        }
        break;

      case 'ArrowRight':
        if (enableArrowKeys) {
          event.preventDefault();
          focusNext();
        }
        break;

      case 'Tab':
        if (enableTabNavigation) {
          // Let the browser handle Tab navigation
          // We just update our focus tracking
          setTimeout(() => {
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && containerRef.current?.contains(activeElement)) {
              const index = focusableElements.current.findIndex(item => item.element === activeElement);
              if (index !== -1) {
                currentFocusIndex.current = index;
                onFocusChange?.(activeElement);
              }
            }
          }, 0);
        }
        break;

      case 'Escape':
        if (enableEscapeKey) {
          event.preventDefault();
          onEscape?.();
        }
        break;

      case 'Enter':
        if (enableEnterKey) {
          event.preventDefault();
          const currentElement = focusableElements.current[currentFocusIndex.current]?.element;
          if (currentElement) {
            onEnter?.(currentElement);
          }
        }
        break;

      case ' ':
        if (enableSpaceKey) {
          event.preventDefault();
          const currentElement = focusableElements.current[currentFocusIndex.current]?.element;
          if (currentElement) {
            onSpace?.(currentElement);
          }
        }
        break;

      case 'Home':
        if (enableHomeEndKeys) {
          event.preventDefault();
          focusFirst();
        }
        break;

      case 'End':
        if (enableHomeEndKeys) {
          event.preventDefault();
          focusLast();
        }
        break;

      case 'PageUp':
        if (enablePageUpDownKeys) {
          event.preventDefault();
          // Jump to previous page of elements (assuming 10 elements per page)
          const pageSize = 10;
          const targetIndex = Math.max(0, currentFocusIndex.current - pageSize);
          focusElement(targetIndex);
        }
        break;

      case 'PageDown':
        if (enablePageUpDownKeys) {
          event.preventDefault();
          // Jump to next page of elements (assuming 10 elements per page)
          const pageSize = 10;
          const targetIndex = Math.min(focusableElements.current.length - 1, currentFocusIndex.current + pageSize);
          focusElement(targetIndex);
        }
        break;
    }
  }, [
    enableArrowKeys,
    enableTabNavigation,
    enableEscapeKey,
    enableEnterKey,
    enableSpaceKey,
    enableHomeEndKeys,
    enablePageUpDownKeys,
    focusByRow,
    focusPrevious,
    focusNext,
    focusFirst,
    focusLast,
    focusElement,
    onEscape,
    onEnter,
    onSpace,
  ]);

  // Initialize focusable elements and event listeners
  useEffect(() => {
    if (!containerRef.current) return;

    // Get initial focusable elements
    focusableElements.current = getFocusableElements();

    // Add keyboard event listener
    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown);

    // Focus the first element if none is currently focused
    if (document.activeElement && !container.contains(document.activeElement)) {
      if (focusableElements.current.length > 0) {
        focusFirst();
      }
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [getFocusableElements, handleKeyDown, focusFirst]);

  // Update focusable elements when container content changes
  useEffect(() => {
    const updateFocusableElements = () => {
      focusableElements.current = getFocusableElements();
    };

    // Use MutationObserver to watch for DOM changes
    const observer = new MutationObserver(updateFocusableElements);
    
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'disabled', 'hidden'],
      });
    }

    return () => observer.disconnect();
  }, [getFocusableElements]);

  // Public API
  return {
    containerRef,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement,
    focusByRow,
    getFocusableElements: () => focusableElements.current,
    getCurrentFocusIndex: () => currentFocusIndex.current,
  };
};

// Hook for managing focus traps (useful for modals)
export const useFocusTrap = (isActive: boolean = true) => {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousFocus.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the container
    const focusableElements = containerRef.current.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [role="button"]'
    );

    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }

    // Handle Tab key to keep focus within the container
    const handleTab = (event: KeyboardEvent) => {
      if (!containerRef.current) return;

      const focusableElements = Array.from(
        containerRef.current.querySelectorAll(
          'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [role="button"]'
        )
      ).filter(el => {
        const element = el as HTMLElement;
        return element.offsetParent !== null && !('disabled' in element && element.disabled);
      }) as HTMLElement[];

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) return;

      if (event.shiftKey) {
        // Shift + Tab: move to previous element
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move to next element
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleTab);
      
      // Restore focus to the previously focused element
      if (previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};
