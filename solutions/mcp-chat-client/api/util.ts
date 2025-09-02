export const convertToCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export const convertToSnakeCase = (str: string) => {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

export const convertToCamelCaseObjectKeys = (obj: Record<string, any>) => {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [convertToCamelCase(key), value]));
}

export const convertToSnakeCaseObjectKeys = (obj: Record<string, any>) => {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [convertToSnakeCase(key), value]));
}

export class MCPAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MCPAuthError';
    }
}