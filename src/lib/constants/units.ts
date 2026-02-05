/**
 * Product Unit Types and Presets
 * 
 * This file contains all unit-related constants for the POS system.
 * Use these instead of hardcoded strings throughout the application.
 */

// Unit type enum for type safety
export const ProductUnit = {
    PIECE: 'PIECE',
    KG: 'KG',
    GRAM: 'GRAM',
    LITRE: 'LITRE',
    ML: 'ML',
} as const

export type ProductUnitType = typeof ProductUnit[keyof typeof ProductUnit]

// Unit display labels
export const UNIT_LABELS: Record<ProductUnitType, string> = {
    [ProductUnit.PIECE]: 'Piece',
    [ProductUnit.KG]: 'Kilogram',
    [ProductUnit.GRAM]: 'Gram',
    [ProductUnit.LITRE]: 'Litre',
    [ProductUnit.ML]: 'Millilitre',
}

// Short display labels for cart/receipts
export const UNIT_SHORT_LABELS: Record<ProductUnitType, string> = {
    [ProductUnit.PIECE]: 'pc',
    [ProductUnit.KG]: 'KG',
    [ProductUnit.GRAM]: 'g',
    [ProductUnit.LITRE]: 'L',
    [ProductUnit.ML]: 'ml',
}

// Weight-based units (support decimal quantities)
export const WEIGHT_UNITS = [
    ProductUnit.KG,
    ProductUnit.GRAM,
] as const

// Volume-based units (support decimal quantities)
export const VOLUME_UNITS = [
    ProductUnit.LITRE,
    ProductUnit.ML,
] as const

// All units that support decimal/fractional quantities
export const DECIMAL_UNITS = [...WEIGHT_UNITS, ...VOLUME_UNITS] as const

/**
 * Check if a unit supports weight-based quantities (KG, GRAM)
 */
export const isWeightUnit = (unit: string): boolean => {
    const normalized = unit.toUpperCase()
    return WEIGHT_UNITS.includes(normalized as typeof WEIGHT_UNITS[number]) ||
        ['G', 'GRAM', 'GRAMS', 'KILOGRAM', 'KILOGRAMS'].includes(normalized)
}

/**
 * Check if a unit supports volume-based quantities (LITRE, ML)
 */
export const isVolumeUnit = (unit: string): boolean => {
    const normalized = unit.toUpperCase()
    return VOLUME_UNITS.includes(normalized as typeof VOLUME_UNITS[number]) ||
        ['L', 'LITER', 'LITERS', 'LITRES', 'MILLILITRE', 'MILLILITER', 'MILLILITRES'].includes(normalized)
}

/**
 * Check if a unit supports decimal quantities (weight or volume based)
 */
export const isDecimalUnit = (unit: string): boolean => {
    return isWeightUnit(unit) || isVolumeUnit(unit)
}

// Preset interface
export interface QuantityPreset {
    label: string
    value: number
}

// Weight presets (for KG-based products)
export const WEIGHT_PRESETS: QuantityPreset[] = [
    { label: '250g', value: 0.25 },
    { label: '500g', value: 0.5 },
    { label: '1 KG', value: 1 },
    { label: '2 KG', value: 2 },
]

// Volume presets (for LITRE-based products)
export const VOLUME_PRESETS: QuantityPreset[] = [
    { label: '100ml', value: 0.1 },
    { label: '250ml', value: 0.25 },
    { label: '500ml', value: 0.5 },
    { label: '1 L', value: 1 },
]

// Gram presets (for GRAM-based products - values in grams)
export const GRAM_PRESETS: QuantityPreset[] = [
    { label: '100g', value: 100 },
    { label: '250g', value: 250 },
    { label: '500g', value: 500 },
    { label: '1 KG', value: 1000 },
]

// ML presets (for ML-based products - values in ml)
export const ML_PRESETS: QuantityPreset[] = [
    { label: '50ml', value: 50 },
    { label: '100ml', value: 100 },
    { label: '250ml', value: 250 },
    { label: '500ml', value: 500 },
]

/**
 * Get appropriate presets based on unit type
 */
export const getPresetsForUnit = (unit: string): QuantityPreset[] => {
    const normalized = unit.toUpperCase()
    
    switch (normalized) {
        case ProductUnit.KG:
        case 'KILOGRAM':
        case 'KILOGRAMS':
            return WEIGHT_PRESETS
        case ProductUnit.GRAM:
        case 'G':
        case 'GRAMS':
            return GRAM_PRESETS
        case ProductUnit.LITRE:
        case 'L':
        case 'LITER':
        case 'LITERS':
        case 'LITRES':
            return VOLUME_PRESETS
        case ProductUnit.ML:
        case 'MILLILITRE':
        case 'MILLILITER':
        case 'MILLILITRES':
            return ML_PRESETS
        default:
            return WEIGHT_PRESETS // Default fallback
    }
}

/**
 * Format quantity with unit for display
 * @param quantity - The quantity value
 * @param unit - The unit type
 * @param useShortLabel - Whether to use short labels (default: true)
 * @returns Formatted string like "0.5 KG" or "500 g"
 */
export const formatQuantityWithUnit = (
    quantity: number,
    unit: string,
    useShortLabel: boolean = true
): string => {
    const normalized = unit.toUpperCase() as ProductUnitType
    const label = useShortLabel
        ? UNIT_SHORT_LABELS[normalized] || unit
        : UNIT_LABELS[normalized] || unit
    
    // Format decimal quantities nicely
    const formattedQty = Number.isInteger(quantity)
        ? quantity.toString()
        : quantity.toFixed(2).replace(/\.?0+$/, '') // Remove trailing zeros
    
    return `${formattedQty} ${label}`
}

/**
 * Get all unit options for dropdowns
 */
export const getUnitOptions = (): Array<{ value: ProductUnitType; label: string }> => {
    return Object.entries(UNIT_LABELS).map(([value, label]) => ({
        value: value as ProductUnitType,
        label,
    }))
}
