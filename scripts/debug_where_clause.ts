
import { buildActivityWhereClause } from '../src/services/activityUtils';
import { ROLES } from '../src/lib/constants';

const mockNC = {
    id: 'nc_user_id',
    role: ROLES.NATIONAL_COORDINATOR,
    siteId: null,
    smallGroupId: null
};

console.log("--- TEST: NC with Reporting Context ---");
const filters = {
    user: mockNC,
    isReportingContext: true,
    statusFilter: { planned: true }
};

const where = buildActivityWhereClause(filters);
console.log("Generated Where Clause:", JSON.stringify(where, null, 2));

if (where.createdById === 'nc_user_id') {
    console.log("PASS: createdById filter is present and correct.");
} else {
    console.error("FAIL: createdById filter is MISSING or INCORRECT.");
}
