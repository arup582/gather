export const classes = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ');
