# POS Responsive Design - Quick Reference

## 📱 Breakpoints

```css
/* Mobile */
< 640px   (sm)

/* Tablet */
640px - 1024px   (md, lg)

/* Desktop */
> 1024px   (xl, 2xl)
```

## 🎨 Layout Patterns

### Navigation
| Screen | Pattern | Implementation |
|--------|---------|----------------|
| Mobile | Bottom Nav + Hamburger | Bottom bar with 5 main items, hamburger for full menu |
| Tablet | Collapsible Sidebar | Slide-out sidebar with overlay |
| Desktop | Fixed Sidebar | Always visible 256px sidebar |

### Cart
| Screen | Pattern | Implementation |
|--------|---------|----------------|
| Mobile | Bottom Sheet + FAB | Floating button (56x56px) opens bottom drawer |
| Tablet | Bottom Sheet | Slide-up drawer (85vh) |
| Desktop | Fixed Panel | 384px right panel |

### Product Grid
| Screen | Columns | Gap |
|--------|---------|-----|
| Mobile | 2 | 2px |
| Tablet | 3-4 | 3px |
| Desktop | 4-5 | 3px |

## ⌨️ Keyboard Shortcuts

### Essential
- `F2` - Focus search
- `F5` - Hold bill
- `F12` - Payment
- `Escape` - Close modals
- `Ctrl + /` - Show shortcuts dialog

### Cart Actions
- `Alt + C` - Clear cart
- `Alt + D` - Add discount
- `Alt + H` - Hold bill

### Navigation
- `Tab` - Next element
- `Shift + Tab` - Previous element
- `Enter` - Select/Confirm
- `Space` - Activate button

## 🎯 Touch Targets

### Minimum Sizes
```css
/* Buttons & Interactive Elements */
min-height: 44px;
min-width: 44px;

/* Primary Actions (FAB) */
min-height: 56px;
min-width: 56px;

/* Input Fields */
min-height: 44px;
```

## ♿ Accessibility Checklist

### ARIA Attributes
- [ ] `aria-label` on icon-only buttons
- [ ] `aria-expanded` on toggles
- [ ] `aria-current` on active links
- [ ] `aria-live` on dynamic content
- [ ] `aria-modal="true"` on dialogs
- [ ] `role="dialog"` on modals
- [ ] `role="navigation"` on nav

### Focus Management
- [ ] Visible focus indicators (ring-2)
- [ ] Logical tab order
- [ ] Focus trap in modals
- [ ] Return focus on modal close

### Screen Readers
- [ ] Semantic HTML (`nav`, `main`, `article`)
- [ ] Alt text on images
- [ ] Descriptive button text
- [ ] Hidden decorative icons (`aria-hidden="true"`)

## 🎨 Component Classes

### Responsive Grid
```tsx
className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3"
```

### Responsive Flex
```tsx
className="flex flex-col lg:flex-row gap-4"
```

### Mobile Hidden
```tsx
className="hidden lg:block"
```

### Desktop Hidden
```tsx
className="lg:hidden"
```

### Touch Target
```tsx
className="min-h-[44px] min-w-[44px]"
```

### Focus Ring
```tsx
className="focus:ring-2 focus:ring-blue-500 focus:border-transparent"
```

## 📦 File Changes Summary

### Modified Files
1. `src/components/pos/POSNav.tsx` - Responsive navigation
2. `src/components/pos/CartPanel.tsx` - Responsive cart with drawer
3. `src/components/pos/ProductGrid.tsx` - Responsive grid with list view
4. `src/app/pos/billing/page.tsx` - Mobile cart button & responsive layout
5. `src/app/pos/layout.tsx` - Added keyboard shortcuts, mobile padding
6. `src/app/globals.css` - Utility classes & accessibility
7. `next.config.ts` - Performance optimizations

### New Files
1. `src/components/pos/KeyboardShortcutsDialog.tsx` - Keyboard shortcuts UI
2. `RESPONSIVE_ACCESSIBILITY_PERFORMANCE_PLAN.md` - Implementation plan
3. `IMPLEMENTATION_SUMMARY.md` - Detailed summary
4. `QUICK_REFERENCE.md` - This file

## 🚀 Testing Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lighthouse audit
npx lighthouse http://localhost:3000/pos/billing --view

# Bundle analysis (add script first)
npm run analyze
```

## 🔍 Testing Checklist

### Mobile (375px)
- [ ] Bottom navigation works
- [ ] Hamburger menu slides out
- [ ] Cart button appears
- [ ] Cart drawer opens
- [ ] Product grid shows 2 columns
- [ ] All buttons are tappable (44x44px+)
- [ ] Text is readable (16px+)

### Tablet (768px)
- [ ] Sidebar collapses
- [ ] Product grid shows 3-4 columns
- [ ] Cart drawer works
- [ ] Touch targets are adequate

### Desktop (1280px+)
- [ ] Fixed sidebar visible
- [ ] Product grid shows 4-5 columns
- [ ] Cart panel fixed right
- [ ] Keyboard shortcuts work
- [ ] List/Grid view toggle works

### Keyboard Only
- [ ] Can navigate entire app with keyboard
- [ ] Focus indicators visible
- [ ] All shortcuts work
- [ ] Modals trap focus

### Screen Reader
- [ ] All content announced
- [ ] Interactive elements have labels
- [ ] Live regions announce updates
- [ ] Navigation makes sense

## 💡 Common Patterns

### Responsive Padding
```tsx
className="p-4 md:p-6"  // 16px mobile, 24px desktop
```

### Responsive Text
```tsx
className="text-sm lg:text-base"  // 14px mobile, 16px desktop
className="text-xl lg:text-2xl"   // 20px mobile, 24px desktop
```

### Conditional Rendering
```tsx
{/* Desktop only */}
<div className="hidden lg:block">Desktop content</div>

{/* Mobile only */}
<div className="lg:hidden">Mobile content</div>
```

### Safe Area Insets
```tsx
className="pb-safe-bottom"  // iOS notch support
```

## 🎯 Performance Tips

1. **Images**: Use Next.js Image component
2. **Lazy Load**: Use dynamic imports for heavy components
3. **Memoization**: Use React.memo for expensive renders
4. **Debounce**: Search inputs should be debounced
5. **Virtual Scroll**: For 100+ items in lists

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web.dev Accessibility](https://web.dev/accessibility/)
- [MDN ARIA Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)

---

**Last Updated**: January 7, 2026
**Status**: ✅ Production Ready
