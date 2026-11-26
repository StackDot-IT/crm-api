import prisma from '../src/config/db.js';

async function checkTeams() {
  const teams = await prisma.team.findMany({
    include: {
      bde: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      leads: { select: { id: true, name: true, budget: true, statusId: true } },
      opportunities: { select: { id: true, opportunityName: true, expectedRevenue: true, status: true } },
      branch: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } }
    }
  });

  console.log('Total teams:', teams.length);
  for (const t of teams) {
    console.log(`Team: ${t.name} (Code: ${t.code}, ID: ${t.id}, Company: ${t.company?.name}, Branch: ${t.branch?.name})`);
    console.log(`  Leader (BDE): ${t.bde?.name || 'None'}`);
    console.log(`  Members: ${t.members.map(m => `${m.user?.name} (${m.role})`).join(', ') || 'None'}`);
    console.log(`  Leads count: ${t.leads.length}`);
    console.log(`  Opportunities count: ${t.opportunities.length}`);
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, employeeId: true, userRoles: { select: { role: { select: { name: true } } } } }
  });
  console.log('\nUsers in DB:');
  for (const u of users) {
    console.log(`  User #${u.id}: ${u.name} (${u.email}) - Roles: ${u.userRoles.map(ur => ur.role.name).join(', ')}`);
  }

  const leads = await prisma.lead.findMany({
    select: { id: true, name: true, budget: true, teamId: true, assignedToId: true }
  });
  console.log(`\nTotal leads in DB: ${leads.length}`);
  console.log('Leads:', leads);

  const revenueLogs = await prisma.revenueLog.findMany({
    select: { id: true, amount: true, teamId: true, leadId: true, opportunityId: true, date: true }
  });
  console.log(`\nTotal revenue logs in DB: ${revenueLogs.length}`);
  console.log('Revenue logs:', revenueLogs);

  process.exit(0);
}

checkTeams().catch((e) => {
  console.error(e);
  process.exit(1);
});
