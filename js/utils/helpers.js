class Helpers {
    static generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }

    static deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    static isNumeric(value) {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

    static formatVoltage(voltage, decimals = 2) {
        return `${voltage.toFixed(decimals)} V`;
    }

    static formatResistance(resistance, decimals = 2) {
        return `${resistance.toFixed(decimals)} Ω`;
    }

    static formatCapacitance(capacitance, decimals = 6) {
        return `${capacitance.toExponential(decimals)} F`;
    }
}
