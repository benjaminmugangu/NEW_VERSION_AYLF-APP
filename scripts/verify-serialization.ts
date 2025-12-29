// scripts/verify-serialization.ts
import { ensurePOJO } from '../src/lib/serialization';

async function testSerialization() {
    console.log("--- Testing ensurePOJO ---");

    const testObject = {
        id: "uuid-1",
        date: new Date("2023-01-01T00:00:00Z"),
        nested: {
            updateTime: new Date("2023-12-25T12:00:00Z"),
            array: [new Date("2024-01-01Z"), { id: 1 }]
        },
        // Mocking a Prisma Decimal
        amount: {
            toNumber: () => 125.50,
            toString: () => "125.50",
            constructor: { name: 'Decimal' }
        },
        // Mocking a BigInt
        bigVal: BigInt(9007199254740991),
        // Function (should be removed or ignored by JSON.stringify anyway, but let's see how our POJO handles it)
        fn: () => "hide me",
        nullVal: null,
        undefVal: undefined
    };

    const result = ensurePOJO(testObject);
    console.log("Input:", JSON.stringify(testObject, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log("Output:", JSON.stringify(result, null, 2));

    // Assertions (conceptually)
    if (typeof result.date !== 'string') throw new Error("Date not converted to string");
    if (typeof result.nested.updateTime !== 'string') throw new Error("Nested Date not converted to string");
    if (typeof result.amount !== 'number') throw new Error("Decimal not converted to number");

    console.log("--- Serialization Test Passed ---");
}

testSerialization().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
