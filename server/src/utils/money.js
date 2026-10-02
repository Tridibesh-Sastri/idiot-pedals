/**
 * Integer money arithmetic.
 *
 * All money math is done in integer MINOR units (paise). Major units (rupees)
 * are used only at the storage/API boundary. Doing arithmetic in paise means
 * subtotals and totals cannot drift the way binary floating point does
 * (0.1 + 0.2 !== 0.3).
 *
 * The API and database keep returning/storing the major-unit `amount`
 * (unchanged public contract); the `*Minor` fields carry the exact integer.
 */

const MINOR_UNITS_PER_MAJOR = 100

/** Hard ceiling (10 crore) — anything above this is a bug or an attack. */
export const MAX_MAJOR_AMOUNT = 100_000_000

const asNumber = (amount) => {
    if (typeof amount === 'number') return amount

    if (typeof amount === 'string' && amount.trim() !== '') {
        const parsed = Number(amount)
        if (Number.isFinite(parsed)) return parsed
    }

    if (amount && typeof amount === 'object' && typeof amount.toString === 'function') {
        const parsed = Number(amount.toString())
        if (Number.isFinite(parsed)) return parsed
    }

    throw new TypeError(`Invalid money amount: ${String(amount)}`)
}

/**
 * Major units (rupees) -> integer minor units (paise).
 * Throws on non-finite, negative, or absurdly large input.
 */
export const toMinor = (amount) => {
    const numeric = asNumber(amount)

    if (!Number.isFinite(numeric)) {
        throw new TypeError(`Invalid money amount: ${String(amount)}`)
    }

    if (numeric < 0) {
        throw new RangeError('Money amount cannot be negative')
    }

    if (numeric > MAX_MAJOR_AMOUNT) {
        throw new RangeError(
            `Money amount exceeds the maximum of ${MAX_MAJOR_AMOUNT}`
        )
    }

    const minor = Math.round(numeric * MINOR_UNITS_PER_MAJOR)

    if (!Number.isSafeInteger(minor)) {
        throw new RangeError(`Money amount is not safely representable: ${String(amount)}`)
    }

    return minor
}

/** Integer minor units (paise) -> major units (rupees). */
export const toMajor = (minor) => {
    if (!Number.isSafeInteger(minor)) {
        throw new TypeError(`Expected an integer minor-unit amount, received: ${String(minor)}`)
    }

    return minor / MINOR_UNITS_PER_MAJOR
}

/** Exact integer sum. Refuses non-integer input rather than silently rounding. */
export const sumMinor = (values) =>
    values.reduce((total, value) => {
        if (!Number.isSafeInteger(value)) {
            throw new TypeError(`Expected an integer minor-unit amount, received: ${String(value)}`)
        }

        return total + value
    }, 0)

/** Integer multiplication of a minor amount by a whole quantity. */
export const multiplyMinor = (minor, quantity) => {
    if (!Number.isSafeInteger(minor)) {
        throw new TypeError(`Expected an integer minor-unit amount, received: ${String(minor)}`)
    }

    if (!Number.isSafeInteger(quantity)) {
        throw new TypeError(`Expected an integer quantity, received: ${String(quantity)}`)
    }

    const product = minor * quantity

    if (!Number.isSafeInteger(product)) {
        throw new RangeError('Money multiplication overflowed the safe integer range')
    }

    return product
}

/** Display helper (emails). Never used for arithmetic. */
export const formatMinor = (minor, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(toMajor(minor))
