import prisma from '../src/config/db.js';
import { updateLeadService } from '../src/modules/lead/lead.services.js';

async function testDuplicateLogic() {
  console.log('--- Running Test: Targeted Duplicate Check on Modified Fields ---');

  // Lead 8 has email 'admin@apexhealth.org'
  // Lead 7 ALSO has email 'admin@apexhealth.org'
  const lead8 = await prisma.lead.findUnique({ where: { id: 8 } });
  const lead7 = await prisma.lead.findUnique({ where: { id: 7 } });

  console.log('Lead 7:', { id: lead7?.id, mobile: lead7?.mobile, email: lead7?.email });
  console.log('Lead 8:', { id: lead8?.id, mobile: lead8?.mobile, email: lead8?.email });

  const actor = {
    id: 1,
    primaryRole: 'SUPER_ADMIN',
    primaryRoleRank: 100,
    companyId: lead8.companyId,
    permissions: {
      LEAD: { canView: true, canEdit: true },
      LEAD_ASSIGNMENT: { canEdit: true }
    }
  };

  // 1. Changing ONLY MOBILE NUMBER on Lead 8 (to 9876543288)
  // Even though Lead 8 currently shares email with Lead 7, since email was NOT modified,
  // this update MUST SUCCEED now in production!
  console.log('\n[TEST 1] Changing ONLY mobile number on Lead 8 to 9876543288...');
  try {
    const updated = await updateLeadService(
      8,
      {
        mobile: '9876543288',
        email: lead8.email // unchanged
      },
      actor
    );
    console.log('✅ TEST 1 PASSED: Lead 8 mobile updated successfully without being blocked by unchanged email collision!');
    console.log('Updated Lead 8:', { id: updated.id, mobile: updated.mobile, email: updated.email });
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message, err.details);
    process.exit(1);
  }

  // 2. Changing MOBILE to an existing mobile (Lead 7's mobile 9079877526)
  // This MUST STILL FAIL because the modified mobile is a duplicate!
  console.log('\n[TEST 2] Changing mobile to Lead 7 mobile (9079877526) - Must fail with DUPLICATE...');
  try {
    await updateLeadService(
      8,
      {
        mobile: lead7.mobile // 9079877526
      },
      actor
    );
    console.error('❌ TEST 2 FAILED: Should have caught duplicate mobile collision!');
    process.exit(1);
  } catch (err) {
    if (err.name === 'DuplicateLeadWarningError' || err.code === 'DUPLICATE_LEAD_WARNING') {
      console.log('✅ TEST 2 PASSED: Correctly caught duplicate collision on newly modified mobile:', err.details?.duplicateField);
    } else {
      console.error('❌ TEST 2 FAILED with unexpected error:', err);
      process.exit(1);
    }
  }

  console.log('\n🎉 ALL PRODUCTION DUPLICATE VALIDATION TESTS PASSED!');
  process.exit(0);
}

testDuplicateLogic().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
