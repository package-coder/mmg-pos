// Formats a TIN as it's typed/stored (digits-only or already dashed) into 000-000-000-000
export const formatTin = (value) => {
    if (!value) return value;

    const digits = String(value).replace(/\D/g, '').slice(0, 12);
    const groups = digits.match(/.{1,3}/g) || [];

    return groups.join('-');
};
