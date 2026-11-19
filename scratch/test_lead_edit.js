import prisma from '../src/config/db.js';
import { updateLeadService } from '../src/modules/lead/lead.services.js';

async function runTest() {
  console.log('--- Starting Automated Test for Lead Edit (Closed/Converted State) ---');

  // Fetch or create a test lead
  let lead = await prisma.lead.findFirst({
    include: { status: true, stage: true, company: true }
  });

  if (!lead) {
    console.error('No lead found in database.');
    process.exit(1);
  }

  const closedStatus = await prisma.leadStatus.findFirst({
    where: { code: 'CLOSED' }
  });

  const openStatus = await prisma.leadStatus.findFirst({
    where: { code: 'OPEN' }
  });

  console.log(`Using Lead #${lead.id} (${lead.name}) for automated test suite.`);

  // Setup: Put lead into CLOSED state (as if it was already converted)
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      statusId: closedStatus.id,
      notes: null, // Lead is closed, notes is currently empty
      qualificationStatus: 'CONVERTED'
    }
  });

  const actor = {
    id: 1,
    primaryRole: 'SUPER_ADMIN',
    primaryRoleRank: 100,
    companyId: lead.companyId,
    permissions: {
      LEAD: { canView: true, canEdit: true },
      LEAD_ASSIGNMENT: { canEdit: true }
    }
  };

  // ────────────────────────────────────────────────────────────────
  // TEST 1: Editing Name/Mobile on ALREADY-CLOSED lead with notes: null
  // ────────────────────────────────────────────────────────────────
  console.log('\n[TEST 1] Editing name and mobile on an already-closed lead (notes: null)...');
  try {
    const updated = await updateLeadService(
      lead.id,
      {
        name: 'Dabhi Bhavyrajj Test',
        statusId: closedStatus.id,
        notes: null
      },
      actor
    );
    console.log('✅ TEST 1 PASSED: Lead name updated to:', updated.name);
    console.log('Status remained:', updated.status?.name);
  } catch (err) {
    console.error('❌ TEST 1 FAILED:', err.message, err.details);
    process.exit(1);
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 2: Transitioning from OPEN to CLOSED WITHOUT notes must FAIL
  // ────────────────────────────────────────────────────────────────
  console.log('\n[TEST 2] Moving an OPEN lead to CLOSED without notes (Must throw ValidationError)...');
  // First set to OPEN
  await prisma.lead.update({
    where: { id: lead.id },
    data: { statusId: openStatus.id, notes: null, qualificationStatus: 'UNQUALIFIED' }
  });

  try {
    await updateLeadService(
      lead.id,
      {
        statusId: closedStatus.id,
        notes: null // Must trigger closure note validation
      },
      actor
    );
    console.error('❌ TEST 2 FAILED: Should have thrown ValidationError when transitioning to CLOSED without notes!');
    process.exit(1);
  } catch (err) {
    if (err.name === 'ValidationError' || err.message?.includes('Validation failed')) {
      console.log('✅ TEST 2 PASSED: Correctly rejected transition to CLOSED with reason:', err.details?.[0]?.message);
    } else {
      console.error('❌ TEST 2 FAILED with unexpected error:', err);
      process.exit(1);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // TEST 3: Transitioning from OPEN to CLOSED WITH notes must SUCCEED
  // ────────────────────────────────────────────────────────────────
  console.log('\n[TEST 3] Moving an OPEN lead to CLOSED WITH valid notes...');
  try {
    const updated = await updateLeadService(
      lead.id,
      {
        statusId: closedStatus.id,
        notes: 'Lead successfully converted after meeting'
      },
      actor
    );
    console.log('✅ TEST 3 PASSED: Transitioned to CLOSED with notes. Lead status:', updated.status?.name);
  } catch (err) {
    console.error('❌ TEST 3 FAILED:', err);
    process.exit(1);
  }

  // Cleanup: Reset back to original state
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      name: lead.name,
      statusId: lead.statusId,
      notes: lead.notes,
      qualificationStatus: lead.qualificationStatus
    }
  });

  console.log('\n🎉 ALL 3 AUTOMATED TESTS PASSED SUCCESSFULLY! Production logic verified.');
  process.exit(0);
}

runTest().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
