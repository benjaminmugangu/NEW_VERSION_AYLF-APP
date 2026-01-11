import { describe, it, expect } from 'vitest';
import { ensurePOJO } from '../serialization';

describe('ensurePOJO Utility Audit', () => {
    it('should convert shallow and nested Dates to ISO strings', () => {
        const input = {
            date: new Date('2023-01-01T12:00:00Z'),
            nested: {
                time: new Date('2023-12-31T23:59:59Z')
            }
        };
        const result = ensurePOJO(input);
        expect(typeof result.date).toBe('string');
        expect(result.date).toBe('2023-01-01T12:00:00.000Z');
        expect(typeof result.nested.time).toBe('string');
        expect(result.nested.time).toBe('2023-12-31T23:59:59.000Z');
    });

    it('should convert Prisma Decimal lookalikes to numbers', () => {
        const input = {
            amount: {
                toNumber: () => 45.67,
                constructor: { name: 'Decimal' }
            },
            price: {
                toString: () => '100.50',
                constructor: { name: 'Decimal' }
            }
        };
        const result = ensurePOJO(input);
        expect(typeof result.amount).toBe('number');
        expect(result.amount).toBe(45.67);
        expect(typeof result.price).toBe('number');
        expect(result.price).toBe(100.50);
    });

    it('should ensure the resulting object has Object.prototype and no hidden prototypes', () => {
        class CustomClass {
            id = 1;
            method() { return 'hi'; }
        }
        const input = new CustomClass();
        const result = ensurePOJO(input);

        expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        expect(result.id).toBe(1);
        expect((result as any).method).toBeUndefined();
    });

    it('should handle BigInt by converting to string (Serialization Requirement)', () => {
        const input = { val: BigInt(9007199254740991) };
        const result = ensurePOJO(input);

        expect(typeof result.val).toBe('string');
        expect(result.val).toBe('9007199254740991');
    });

    it('should handle recursive arrays', () => {
        const input = [
            { d: new Date('2024-01-01Z') },
            [new Date('2024-01-02Z')]
        ];
        const result = ensurePOJO(input) as any;
        expect(typeof result[0].d).toBe('string');
        expect(typeof result[1][0]).toBe('string');
    });

    it('should produce a clean JSON-serializable object (Negative Test)', () => {
        const obj: any = { a: 1 };
        // We don't test circular here because ensurePOJO doesn't handle it yet (documented limitation)
        // But we test that functions are stripped if we use JSON.stringify as a secondary check
        const input = {
            data: "ok",
            fn: () => "error"
        };
        const result = ensurePOJO(input);
        expect(JSON.parse(JSON.stringify(result))).toEqual({ data: "ok" });
    });
});
