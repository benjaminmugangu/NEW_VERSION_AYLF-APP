const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sglId = 'kp_0c4c6733e6134d589b3be30eddfc5b86'; // Ben (SGL)
    const ncId = 'kp_f070dfbe8f9b4d838ba3de2f2804e9cb'; // Benjamin (NC)

    const siteId = 'site-goma';
    const groupId = 'group-goma-ulpgl';

    console.log("Fetching valid ActivityType...");
    const activityType = await prisma.activityType.findFirst();
    if (!activityType) {
        throw new Error("No ActivityType found in database. Cannot create activities.");
    }
    console.log(`Using ActivityTypeId: ${activityType.id}`);

    console.log("Cleaning up previous test activities...");
    await prisma.activity.deleteMany({
        where: { title: { contains: '[TEST-ISOLATION]' } }
    });

    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24h ago
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h future

    console.log("Creating test activities...");

    // 1. SGL Eligible Activity (Owns + Past date)
    await prisma.activity.create({
        data: {
            title: '[TEST-ISOLATION] SGL Eligible Activity',
            date: pastDate,
            status: 'planned',
            level: 'small_group',
            activityType: { connect: { id: activityType.id } },
            thematic: 'Test',
            participantsCountPlanned: 10,
            createdBy: { connect: { id: sglId } },
            site: { connect: { id: siteId } },
            smallGroup: { connect: { id: groupId } }
        }
    });

    // 2. SGL Ineligible Activity (Owns + Future date) -> Should be hidden by 5h rule
    await prisma.activity.create({
        data: {
            title: '[TEST-ISOLATION] SGL Future Activity',
            date: futureDate,
            status: 'planned',
            level: 'small_group',
            activityType: { connect: { id: activityType.id } },
            thematic: 'Test',
            participantsCountPlanned: 10,
            createdBy: { connect: { id: sglId } },
            site: { connect: { id: siteId } },
            smallGroup: { connect: { id: groupId } }
        }
    });

    // 3. NC Activity (Not Owned) -> Should be hidden by Isolation rule
    await prisma.activity.create({
        data: {
            title: '[TEST-ISOLATION] NC Activity',
            date: pastDate,
            status: 'planned',
            level: 'site',
            activityType: { connect: { id: activityType.id } },
            thematic: 'Test',
            participantsCountPlanned: 10,
            createdBy: { connect: { id: ncId } },
            site: { connect: { id: siteId } }
            // No small group for site-level activity
        }
    });

    console.log("Test data seeded successfully.");
}

main()
    .catch(e => {
        console.error("Error creating activity:");
        console.error(e.message);
        // console.error(JSON.stringify(e, null, 2));
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
